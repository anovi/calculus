import type { PairEntry, PairKey } from "./types";

const STORAGE_KEY = "calculus:rates:v1";
const SCHEMA_VERSION = 1;

type SerializedSnapshot = {
	version: number;
	entries: Record<PairKey, PairEntry>;
};

function getStorage(): Storage | null {
	try {
		if (typeof localStorage === "undefined") return null;
		return localStorage;
	} catch {
		return null;
	}
}

function isPairEntry(value: unknown): value is PairEntry {
	if (value === null || typeof value !== "object") return false;
	const e = value as Record<string, unknown>;
	return (
		typeof e.rate === "number" &&
		Number.isFinite(e.rate) &&
		typeof e.date === "string" &&
		typeof e.fetchedAt === "number" &&
		Number.isFinite(e.fetchedAt)
	);
}

/** Reads a previously-saved snapshot. Returns an empty map (and clears the key) on any malformed data. */
export function loadSnapshot(): Map<PairKey, PairEntry> {
	const storage = getStorage();
	if (!storage) return new Map();

	const raw = storage.getItem(STORAGE_KEY);
	if (raw === null) return new Map();

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			parsed === null ||
			typeof parsed !== "object" ||
			(parsed as SerializedSnapshot).version !== SCHEMA_VERSION
		) {
			storage.removeItem(STORAGE_KEY);
			return new Map();
		}
		const entriesObj = (parsed as SerializedSnapshot).entries;
		if (entriesObj === null || typeof entriesObj !== "object") {
			storage.removeItem(STORAGE_KEY);
			return new Map();
		}
		const out = new Map<PairKey, PairEntry>();
		for (const [key, value] of Object.entries(entriesObj)) {
			if (typeof key !== "string" || key.length === 0) continue;
			if (!isPairEntry(value)) continue;
			out.set(key, value);
		}
		return out;
	} catch {
		storage.removeItem(STORAGE_KEY);
		return new Map();
	}
}

/** Writes the full map. Silently no-ops when storage is unavailable (e.g. private mode, quota exceeded, SSR). */
export function saveSnapshot(entries: Map<PairKey, PairEntry>): void {
	const storage = getStorage();
	if (!storage) return;

	const snapshot: SerializedSnapshot = {
		version: SCHEMA_VERSION,
		entries: Object.fromEntries(entries),
	};
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// Quota exceeded or storage unavailable; drop silently.
	}
}
