import { bench, describe } from 'vitest';

import { BinarySearchArray } from '../lib/binary-search-array';
import { PrefixTree } from '../lib/prefix-tree';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Deterministic LCG for reproducible word sets across runs. */
function mulberry32(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomWord(rng: () => number, len: number): string {
	let out = '';
	for (let i = 0; i < len; i++) {
		out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
	}
	return out;
}

function generateWords(count: number, seed: number): string[] {
	const rng = mulberry32(seed);
	const seen = new Set<string>();
	const words: string[] = [];
	while (words.length < count) {
		const len = 3 + Math.floor(rng() * 3); // 3–5 chars, like ISO codes
		const w = randomWord(rng, len);
		if (seen.has(w)) continue;
		seen.add(w);
		words.push(w);
	}
	return words;
}

/** Mix of hits (~half) and misses; hits use varied casing like real input. */
function generateSearches(
	words: readonly string[],
	count: number,
	seed: number,
): string[] {
	const rng = mulberry32(seed);
	const queries: string[] = [];
	for (let i = 0; i < count; i++) {
		if (rng() < 0.5) {
			const w = words[Math.floor(rng() * words.length)]!;
			const flipCase = rng() < 0.5;
			queries.push(
				flipCase
					? w.replace(/[a-z]/g, (ch) => ch.toUpperCase())
					: w,
			);
		} else {
			let miss: string;
			do {
				miss = randomWord(rng, 3 + Math.floor(rng() * 3));
			} while (words.includes(miss));
			queries.push(miss);
		}
	}
	return queries;
}

/** Tune down if the array bench is too slow locally (it is O(words × searches)). */
const WORD_COUNT = 5_000;
const SEARCH_COUNT = 50_000;

const words = generateWords(WORD_COUNT, 0xc41c0105);
const searches = generateSearches(words, SEARCH_COUNT, 0x10010000);
const trie = PrefixTree.fromWords(words);
const sortedArray = BinarySearchArray.fromWords(words);

function arrayHasWord(list: readonly string[], query: string): boolean {
	const key = query.toLowerCase();
	for (const w of list) {
		if (w.toLowerCase() === key) return true;
	}
	return false;
}

describe(`word lookup (${WORD_COUNT} words, ${SEARCH_COUNT} searches)`, () => {
	bench('PrefixTree.hasWord', () => {
		for (const q of searches) trie.hasWord(q);
	});

	bench('array linear scan (case-insensitive)', () => {
		for (const q of searches) arrayHasWord(words, q);
	});

	bench('sorted array binary search (case-insensitive)', () => {
		for (const q of searches) sortedArray.hasWord(q);
	});
});
