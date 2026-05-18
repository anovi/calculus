import {
	fetchBaseRates as defaultFetchBaseRates,
	fetchPair as defaultFetchPair,
} from "./frankfurter";
import { pairKey } from "./pair-key";
import {
	loadSnapshot as defaultLoadSnapshot,
	saveSnapshot as defaultSaveSnapshot,
} from "./persistence";
import type { CurrencyCode } from '../units/currency';
import {
	STALE_AFTER_MS,
	WARMUP_QUOTES,
	type PairEntry,
	type PairKey,
	type PairState,
} from "./types";

/** Subset of the network adapter the store needs. Matches the shape of ./frankfurter. */
export type RatesFetcher = {
	fetchPair: typeof defaultFetchPair;
	fetchBaseRates: typeof defaultFetchBaseRates;
};

/** Subset of the persistence adapter the store needs. Matches the shape of ./persistence. */
export type RatesPersistence = {
	load: () => Map<PairKey, PairEntry>;
	save: (entries: Map<PairKey, PairEntry>) => void;
};

export type RatesStoreDeps = {
	fetcher?: RatesFetcher;
	persistence?: RatesPersistence;
	/** Defaults to {@link Date.now}. Inject a controllable clock in tests. */
	now?: () => number;
	/** Defaults to {@link STALE_AFTER_MS}. */
	staleAfterMs?: number;
	/** Debounce window for persistence writes in ms. Defaults to 500. */
	persistDebounceMs?: number;
};

type Subscriber = (state: PairState) => void;

const DEFAULT_PERSIST_DEBOUNCE_MS = 500;

export class RatesStore {
	private readonly entries: Map<PairKey, PairEntry>;
	private readonly inflight = new Map<PairKey, Promise<void>>();
	private readonly subscribers = new Map<PairKey, Set<Subscriber>>();

	private readonly fetcher: RatesFetcher;
	private readonly persistence: RatesPersistence;
	private readonly now: () => number;
	private readonly staleAfterMs: number;
	private readonly persistDebounceMs: number;

	private persistTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(deps: RatesStoreDeps = {}) {
		this.fetcher = deps.fetcher ?? {
			fetchPair: defaultFetchPair,
			fetchBaseRates: defaultFetchBaseRates,
		};
		this.persistence = deps.persistence ?? {
			load: defaultLoadSnapshot,
			save: defaultSaveSnapshot,
		};
		this.now = deps.now ?? Date.now;
		this.staleAfterMs = deps.staleAfterMs ?? STALE_AFTER_MS;
		this.persistDebounceMs = deps.persistDebounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS;

		this.entries = this.persistence.load();
	}

	/** Sync read of cached rate. Same-currency pairs return 1 without fetching. Otherwise schedules a background fetch if the entry is missing or stale. */
	getRate(from: CurrencyCode, to: CurrencyCode): number | null {
		if (from.toUpperCase() === to.toUpperCase()) return 1;
		const key = pairKey(from, to);
		const entry = this.entries.get(key);
		if (entry === undefined) {
			void this.ensureFetched(from, to, key);
			return null;
		}
		if (this.isStale(entry)) {
			void this.ensureFetched(from, to, key);
		}
		return entry.rate;
	}

	/** Sync read of the full cached entry (rate + date + fetchedAt). Same refetch semantics as {@link getRate}. */
	getEntry(from: CurrencyCode, to: CurrencyCode): PairEntry | null {
		const key = pairKey(from, to);
		const entry = this.entries.get(key);
		if (entry === undefined) {
			void this.ensureFetched(from, to, key);
			return null;
		}
		if (this.isStale(entry)) {
			void this.ensureFetched(from, to, key);
		}
		return entry;
	}

	/** True while a network request for this pair is in flight. */
	isFetching(from: CurrencyCode, to: CurrencyCode): boolean {
		return this.inflight.has(pairKey(from, to));
	}

	/**
	 * Register a listener for state changes on a specific pair. The callback fires whenever the entry
	 * is updated or the fetching flag flips. Returns an unsubscribe function.
	 */
	subscribe(
		from: CurrencyCode,
		to: CurrencyCode,
		cb: Subscriber,
	): () => void {
		const key = pairKey(from, to);
		let set = this.subscribers.get(key);
		if (set === undefined) {
			set = new Set();
			this.subscribers.set(key, set);
		}
		set.add(cb);
		return () => {
			const current = this.subscribers.get(key);
			if (current === undefined) return;
			current.delete(cb);
			if (current.size === 0) this.subscribers.delete(key);
		};
	}

	/** Explicit async fetch. Resolves with the stored entry on success, or null if the request failed. */
	async requestPair(
		from: CurrencyCode,
		to: CurrencyCode,
	): Promise<PairEntry | null> {
		const key = pairKey(from, to);
		await this.ensureFetched(from, to, key);
		return this.entries.get(key) ?? null;
	}

	/**
	 * Warm up the cache by fetching every pair derived from EUR and USD bases against {@link WARMUP_QUOTES}.
	 * Safe to call multiple times; results are merged into the in-memory map and persisted.
	 */
	async warmup(): Promise<void> {
		const fetchedAt = this.now();
		const [eurRows, usdRows] = await Promise.allSettled([
			this.fetcher.fetchBaseRates("EUR", WARMUP_QUOTES),
			this.fetcher.fetchBaseRates("USD", WARMUP_QUOTES),
		]);
		this.absorbBaseResult("EUR", eurRows, fetchedAt);
		this.absorbBaseResult("USD", usdRows, fetchedAt);
		this.schedulePersist();
	}

	private absorbBaseResult(
		base: CurrencyCode,
		result: PromiseSettledResult<Awaited<ReturnType<RatesFetcher["fetchBaseRates"]>>>,
		fetchedAt: number,
	): void {
		if (result.status !== "fulfilled") {
			console.warn(`Rates warmup failed for base ${base}:`, result.reason);
			return;
		}
		for (const row of result.value) {
			const key = pairKey(base, row.quote);
			this.entries.set(key, { rate: row.rate, date: row.date, fetchedAt });
			this.notify(key);
		}
	}

	private isStale(entry: PairEntry): boolean {
		return this.now() - entry.fetchedAt > this.staleAfterMs;
	}

	private ensureFetched(
		from: CurrencyCode,
		to: CurrencyCode,
		key: PairKey,
	): Promise<void> {
		const existing = this.inflight.get(key);
		if (existing !== undefined) return existing;

		const promise = (async () => {
			try {
				const entry = await this.fetcher.fetchPair(from, to);
				this.entries.set(key, { ...entry, fetchedAt: this.now() });
				this.schedulePersist();
			} catch (err) {
				console.warn(`Failed to fetch rate ${key}:`, err);
			} finally {
				this.inflight.delete(key);
				this.notify(key);
			}
		})();

		this.inflight.set(key, promise);
		this.notify(key);
		return promise;
	}

	private notify(key: PairKey): void {
		const set = this.subscribers.get(key);
		if (set === undefined || set.size === 0) return;
		const state: PairState = {
			entry: this.entries.get(key) ?? null,
			isFetching: this.inflight.has(key),
		};
		for (const cb of [...set]) {
			try {
				cb(state);
			} catch (err) {
				console.error("Rates subscriber threw:", err);
			}
		}
	}

	private schedulePersist(): void {
		if (this.persistTimer !== null) return;
		this.persistTimer = setTimeout(() => {
			this.persistTimer = null;
			this.persistence.save(this.entries);
		}, this.persistDebounceMs);
	}
}
