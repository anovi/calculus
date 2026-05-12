const NONE = -1;

function normalizeKey(s: string): number[] {
	const out: number[] = [];
	for (const ch of s.toLowerCase()) {
		out.push(ch.codePointAt(0)!);
	}
	return out;
}

/** Lowercase trie key for one UTF-16 code unit (ASCII fast path). */
function trieKeyFromUtf16Unit(c: number): number {
	if (c < 0) return c;
	if (c >= 65 && c <= 90) return c + 32;
	if (c >= 97 && c <= 122) return c;
	return String.fromCharCode(c).toLowerCase().codePointAt(0)!;
}

/**
 * Case-insensitive prefix tree (trie) backed by parallel arrays.
 * Each node is an index into `firstChild`, `nextSibling`, `edgeChar`, and `isTerminal`.
 */
export class PrefixTree {
	readonly firstChild: number[];
	readonly nextSibling: number[];
	readonly edgeChar: number[];
	readonly isTerminal: Uint8Array;

	private constructor(
		firstChild: number[],
		nextSibling: number[],
		edgeChar: number[],
		isTerminal: Uint8Array,
	) {
		this.firstChild = firstChild;
		this.nextSibling = nextSibling;
		this.edgeChar = edgeChar;
		this.isTerminal = isTerminal;
	}

	/** Builds a trie from the given strings (matching is case-insensitive). */
	static fromWords(words: readonly string[]): PrefixTree {
		const firstChild: number[] = [];
		const nextSibling: number[] = [];
		const edgeChar: number[] = [];
		const isTerminal: number[] = [];

		const allocNode = (char: number): number => {
			const id = firstChild.length;
			firstChild.push(NONE);
			nextSibling.push(NONE);
			edgeChar.push(char);
			isTerminal.push(0);
			return id;
		};

		allocNode(0); // root

		const findChild = (parent: number, code: number): number => {
			let child = firstChild[parent];
			while (child !== NONE) {
				if (edgeChar[child] === code) return child;
				child = nextSibling[child];
			}
			return NONE;
		};

		const linkChild = (parent: number, code: number): number => {
			const id = allocNode(code);
			nextSibling[id] = firstChild[parent];
			firstChild[parent] = id;
			return id;
		};

		for (const word of words) {
			const codes = normalizeKey(word);
			let node = 0;
			for (const code of codes) {
				const next = findChild(node, code);
				if (next === NONE) {
					node = linkChild(node, code);
				} else {
					node = next;
				}
			}
			isTerminal[node] = 1;
		}

		return new PrefixTree(
			firstChild,
			nextSibling,
			edgeChar,
			new Uint8Array(isTerminal),
		);
	}

	get nodeCount(): number {
		return this.firstChild.length;
	}

	/** True if the full string exists as a word (case-insensitive). */
	hasWord(s: string): boolean {
		const node = this.walk(normalizeKey(s));
		return node !== NONE && this.isTerminal[node] === 1;
	}

	/** True if any inserted word starts with this prefix (case-insensitive). */
	hasPrefix(prefix: string): boolean {
		return this.walk(normalizeKey(prefix)) !== NONE;
	}

	/**
	 * Length (in UTF-16 code units) of the longest inserted word that matches
	 * `peek(0)…peek(length-1)` from the start. Returns 0 if no word matches.
	 *
	 * Matching is case-insensitive. Assumes each inserted word maps one trie edge
	 * per UTF-16 code unit (true for ASCII such as ISO 4217 codes).
	 *
	 * @param peek - relative offset in code units; must return a value below 0 past end of input
	 */
	longestMatchUtf16(peek: (offset: number) => number): number {
		let node = 0;
		let best = 0;
		let depth = 0;
		for (;;) {
			const unit = peek(depth);
			if (unit < 0) break;
			const key = trieKeyFromUtf16Unit(unit);
			const child = this.childForCode(node, key);
			if (child === NONE) break;
			node = child;
			depth++;
			if (this.isTerminal[node] === 1) best = depth;
		}
		return best;
	}

	private childForCode(node: number, code: number): number {
		let child = this.firstChild[node];
		while (child !== NONE) {
			if (this.edgeChar[child] === code) return child;
			child = this.nextSibling[child];
		}
		return NONE;
	}

	private walk(codes: readonly number[]): number {
		let node = 0;
		for (const code of codes) {
			const found = this.childForCode(node, code);
			if (found === NONE) return NONE;
			node = found;
		}
		return node;
	}
}
