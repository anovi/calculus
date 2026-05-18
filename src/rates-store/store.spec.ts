import assert from "node:assert";
import { RatesStore, type RatesFetcher, type RatesPersistence } from "./store";
import type { CurrencyCode } from '../units/currency';
import {
	STALE_AFTER_MS,
	type PairEntry,
	type PairKey,
	type PairState,
} from "./types";
import type { BaseRateRow } from "./frankfurter";

/** Flush microtasks and the macrotask queue so awaited fetch promises settle. */
function flushMicrotasks(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve));
}

type SaveMock = ReturnType<typeof vi.fn<(entries: Map<PairKey, PairEntry>) => void>>;
type FetchPairMock = ReturnType<
	typeof vi.fn<(from: CurrencyCode, to: CurrencyCode) => Promise<PairEntry>>
>;
type FetchBaseRatesMock = ReturnType<
	typeof vi.fn<
		(base: CurrencyCode, quotes: readonly CurrencyCode[]) => Promise<BaseRateRow[]>
	>
>;

function makePersistence(
	initial?: Map<PairKey, PairEntry>,
): RatesPersistence & { save: SaveMock } {
	return {
		load: () => new Map(initial ?? []),
		save: vi.fn<(entries: Map<PairKey, PairEntry>) => void>(),
	};
}

function makeFetcher(): RatesFetcher & {
	fetchPair: FetchPairMock;
	fetchBaseRates: FetchBaseRatesMock;
} {
	return {
		fetchPair: vi.fn<(from: CurrencyCode, to: CurrencyCode) => Promise<PairEntry>>(),
		fetchBaseRates: vi.fn<
			(base: CurrencyCode, quotes: readonly CurrencyCode[]) => Promise<BaseRateRow[]>
		>(),
	};
}

describe("RatesStore", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
		vi.useRealTimers();
	});

	it("returns null and triggers a fetch when the pair is missing", async () => {
		const fetcher = makeFetcher();
		const entry: PairEntry = { rate: 1.08, date: "2026-05-14", fetchedAt: 1_000 };
		fetcher.fetchPair.mockResolvedValue(entry);

		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		assert.strictEqual(store.getRate("EUR", "USD"), null);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 1);
		assert.deepStrictEqual(fetcher.fetchPair.mock.calls[0], ["EUR", "USD"]);
		assert.strictEqual(store.isFetching("EUR", "USD"), true);

		await flushMicrotasks();

		assert.strictEqual(store.isFetching("EUR", "USD"), false);
		assert.strictEqual(store.getRate("EUR", "USD"), 1.08);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 1);
	});

	it("returns 1 for identical currencies without calling fetchPair", () => {
		const fetcher = makeFetcher();
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
		});

		assert.strictEqual(store.getRate("USD", "USD"), 1);
		assert.strictEqual(store.getRate("usd" as CurrencyCode, "USD"), 1);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 0);
	});

	it("returns the cached value without fetching when fresh", () => {
		const fetcher = makeFetcher();
		const persistence = makePersistence(
			new Map([["EUR->USD", { rate: 1.05, date: "2026-05-14", fetchedAt: 1_000 }]]),
		);
		const store = new RatesStore({
			fetcher,
			persistence,
			now: () => 1_000,
		});

		assert.strictEqual(store.getRate("EUR", "USD"), 1.05);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 0);
	});

	it("returns the stale cached value and schedules a background refetch", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockResolvedValue({
			rate: 1.1,
			date: "2026-05-14",
			fetchedAt: 0,
		});
		const start = 1_000_000_000;
		const persistence = makePersistence(
			new Map([
				[
					"EUR->USD",
					{ rate: 1.05, date: "2026-05-13", fetchedAt: start - STALE_AFTER_MS - 1 },
				],
			]),
		);
		const store = new RatesStore({
			fetcher,
			persistence,
			now: () => start,
			persistDebounceMs: 0,
		});

		assert.strictEqual(store.getRate("EUR", "USD"), 1.05);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 1);

		await flushMicrotasks();

		assert.strictEqual(store.getRate("EUR", "USD"), 1.1);
	});

	it("deduplicates concurrent fetches for the same pair", async () => {
		const fetcher = makeFetcher();
		let resolveFetch: ((entry: PairEntry) => void) | null = null;
		fetcher.fetchPair.mockReturnValue(
			new Promise<PairEntry>((res) => {
				resolveFetch = res;
			}),
		);

		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
		});

		assert.strictEqual(store.getRate("EUR", "USD"), null);
		assert.strictEqual(store.getRate("EUR", "USD"), null);
		store.getRate("EUR", "USD");
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 1);

		resolveFetch!({ rate: 1.08, date: "2026-05-14", fetchedAt: 0 });
		await flushMicrotasks();

		assert.strictEqual(store.getRate("EUR", "USD"), 1.08);
		assert.strictEqual(fetcher.fetchPair.mock.calls.length, 1);
	});

	it("notifies subscribers when fetching starts and when it completes", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockResolvedValue({
			rate: 1.08,
			date: "2026-05-14",
			fetchedAt: 0,
		});
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		const states: PairState[] = [];
		const unsubscribe = store.subscribe("EUR", "USD", (s) => states.push(s));

		store.getRate("EUR", "USD");
		await flushMicrotasks();

		assert.strictEqual(states.length, 2);
		assert.strictEqual(states[0].isFetching, true);
		assert.strictEqual(states[0].entry, null);
		assert.strictEqual(states[1].isFetching, false);
		assert.strictEqual(states[1].entry?.rate, 1.08);

		unsubscribe();
		await store.requestPair("EUR", "USD");
		assert.strictEqual(states.length, 2);
	});

	it("does not notify subscribers of unrelated pairs", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockResolvedValue({
			rate: 1.08,
			date: "2026-05-14",
			fetchedAt: 0,
		});
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		const gbpStates: PairState[] = [];
		store.subscribe("EUR", "GBP", (s) => gbpStates.push(s));

		store.getRate("EUR", "USD");
		await flushMicrotasks();

		assert.strictEqual(gbpStates.length, 0);
	});

	it("flips isFetching back and leaves entries untouched when the fetch fails", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockRejectedValue(new Error("boom"));
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		const states: PairState[] = [];
		store.subscribe("EUR", "USD", (s) => states.push(s));

		assert.strictEqual(store.getRate("EUR", "USD"), null);
		await flushMicrotasks();

		assert.strictEqual(store.isFetching("EUR", "USD"), false);
		assert.strictEqual(states.length, 2);
		assert.strictEqual(states[0].isFetching, true);
		assert.strictEqual(states[0].entry, null);
		assert.strictEqual(states[1].isFetching, false);
		assert.strictEqual(states[1].entry, null);
		assert.ok(warnSpy.mock.calls.length >= 1);
	});

	it("hydrates entries from persistence at construction", () => {
		const persistence = makePersistence(
			new Map([
				["EUR->USD", { rate: 1.05, date: "2026-05-13", fetchedAt: 1_000 }],
				["USD->EUR", { rate: 0.95, date: "2026-05-13", fetchedAt: 1_000 }],
			]),
		);
		const store = new RatesStore({
			fetcher: makeFetcher(),
			persistence,
			now: () => 1_000,
		});

		assert.strictEqual(store.getRate("EUR", "USD"), 1.05);
		assert.strictEqual(store.getRate("USD", "EUR"), 0.95);
	});

	it("persists after a successful fetch (debounced)", async () => {
		vi.useFakeTimers();
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockResolvedValue({
			rate: 1.08,
			date: "2026-05-14",
			fetchedAt: 0,
		});
		const persistence = makePersistence();
		const store = new RatesStore({
			fetcher,
			persistence,
			now: () => 1_000,
			persistDebounceMs: 500,
		});

		await store.requestPair("EUR", "USD");

		assert.strictEqual(persistence.save.mock.calls.length, 0);

		vi.advanceTimersByTime(500);
		assert.strictEqual(persistence.save.mock.calls.length, 1);
		const written = persistence.save.mock.calls[0][0] as Map<PairKey, PairEntry>;
		assert.strictEqual(written.get("EUR->USD")?.rate, 1.08);
	});

	it("requestPair resolves with the stored entry on success and null on failure", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair
			.mockResolvedValueOnce({ rate: 1.08, date: "2026-05-14", fetchedAt: 0 })
			.mockRejectedValueOnce(new Error("nope"));
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		const ok = await store.requestPair("EUR", "USD");
		assert.strictEqual(ok?.rate, 1.08);

		const fail = await store.requestPair("EUR", "GBP");
		assert.strictEqual(fail, null);
	});

	it("warmup populates pairs from both EUR and USD bases", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchBaseRates.mockImplementation(async (base: string) => {
			if (base === "EUR") {
				return [
					{ quote: "USD", rate: 1.08, date: "2026-05-14" },
					{ quote: "GBP", rate: 0.84, date: "2026-05-14" },
				];
			}
			return [
				{ quote: "EUR", rate: 0.93, date: "2026-05-14" },
				{ quote: "GBP", rate: 0.78, date: "2026-05-14" },
			];
		});
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 5_000,
			persistDebounceMs: 0,
		});

		await store.warmup();

		assert.strictEqual(store.getRate("EUR", "USD"), 1.08);
		assert.strictEqual(store.getRate("EUR", "GBP"), 0.84);
		assert.strictEqual(store.getRate("USD", "EUR"), 0.93);
		assert.strictEqual(store.getRate("USD", "GBP"), 0.78);
		const eurUsd = store.getEntry("EUR", "USD");
		assert.strictEqual(eurUsd?.fetchedAt, 5_000);
	});

	it("warmup tolerates one base failing without dropping the other", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchBaseRates.mockImplementation(async (base: string) => {
			if (base === "EUR") {
				return [{ quote: "USD", rate: 1.08, date: "2026-05-14" }];
			}
			throw new Error("usd base offline");
		});
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		await store.warmup();

		assert.strictEqual(store.getRate("EUR", "USD"), 1.08);
		assert.strictEqual(store.getEntry("USD", "EUR"), null);
		assert.ok(warnSpy.mock.calls.length >= 1);
	});

	it("unsubscribe stops further notifications and cleans up empty subscriber sets", async () => {
		const fetcher = makeFetcher();
		fetcher.fetchPair.mockResolvedValue({
			rate: 1.08,
			date: "2026-05-14",
			fetchedAt: 0,
		});
		const store = new RatesStore({
			fetcher,
			persistence: makePersistence(),
			now: () => 1_000,
			persistDebounceMs: 0,
		});

		const calls: PairState[] = [];
		const unsub = store.subscribe("EUR", "USD", (s) => calls.push(s));
		unsub();

		await store.requestPair("EUR", "USD");
		assert.strictEqual(calls.length, 0);
	});
});
