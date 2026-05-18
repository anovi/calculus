const NONE = -1;

function normalizeKey(s: string): number[] {
	const out: number[] = [];
	for (const ch of s.toLowerCase()) {
		out.push(ch.codePointAt(0)!);
	}
	return out;
}

function wordFromCodePoints(codes: readonly number[]): string {
	let s = "";
	for (const c of codes) {
		s += String.fromCodePoint(c);
	}
	return s;
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
 * Terminal nodes may optionally store a value of type `T` (default: none).
 */
export class PrefixTree<T = void> {
	readonly firstChild: number[];
	readonly nextSibling: number[];
	readonly edgeChar: number[];

	private readonly terminal: number[];
	private readonly leafValues: (T | undefined)[];

	private constructor(
		firstChild: number[],
		nextSibling: number[],
		edgeChar: number[],
		terminal: number[],
		leafValues: (T | undefined)[],
	) {
		this.firstChild = firstChild;
		this.nextSibling = nextSibling;
		this.edgeChar = edgeChar;
		this.terminal = terminal;
		this.leafValues = leafValues;
	}

	/** Snapshot of terminal flags (one per node). */
	get isTerminal(): Uint8Array {
		return new Uint8Array(this.terminal);
	}

	/** Empty trie; use `addWord` to populate. */
	static empty<T = void>(): PrefixTree<T> {
		return PrefixTree.createEmpty();
	}

	/** Builds a trie from the given strings (matching is case-insensitive). */
	static fromWords(words: readonly string[]): PrefixTree<void> {
		const trie = PrefixTree.empty();
		for (const word of words) {
			trie.addWord(word);
		}
		return trie;
	}

	get nodeCount(): number {
		return this.firstChild.length;
	}

	/** Inserts a word (case-insensitive). Replaces any existing value at that word. */
	addWord(word: string, ...args: T extends void ? [] : [value: T]): void {
		const value = args[0] as T | undefined;
		const codes = normalizeKey(word);
		let node = 0;
		for (const code of codes) {
			const next = this.childForCode(node, code);
			if (next === NONE) {
				node = this.linkChild(node, code);
			} else {
				node = next;
			}
		}
		this.terminal[node] = 1;
		this.leafValues[node] = value;
	}

	/** Value stored at this word, or `undefined` if the word is absent or has no value. */
	getWordValue(s: string): T | undefined {
		const node = this.walk(normalizeKey(s));
		if (node === NONE || this.terminal[node] !== 1) return undefined;
		return this.leafValues[node];
	}

	/** True if the full string exists as a word (case-insensitive). */
	hasWord(s: string): boolean {
		const node = this.walk(normalizeKey(s));
		return node !== NONE && this.terminal[node] === 1;
	}

	/** True if any inserted word starts with this prefix (case-insensitive). */
	hasPrefix(prefix: string): boolean {
		return this.walk(normalizeKey(prefix)) !== NONE;
	}

	/**
	 * All inserted words whose lowercase form starts with `prefix` (case-insensitive),
	 * with the value stored at each terminal (or `undefined` when none).
	 * Words are returned in lowercase, matching the trie’s internal keys.
	 */
	searchByPrefix(prefix: string): Array<{ word: string; value: T | undefined }> {
		const prefixCodes = normalizeKey(prefix);
		const start = this.walk(prefixCodes);
		if (start === NONE) return [];

		const out: Array<{ word: string; value: T | undefined }> = [];
		const path = prefixCodes.slice();

		const visit = (node: number): void => {
			if (this.terminal[node] === 1) {
				out.push({
					word: wordFromCodePoints(path),
					value: this.leafValues[node],
				});
			}
			let child = this.firstChild[node];
			while (child !== NONE) {
				path.push(this.edgeChar[child]);
				visit(child);
				path.pop();
				child = this.nextSibling[child];
			}
		};

		visit(start);
		return out;
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
			if (this.terminal[node] === 1) best = depth;
		}
		return best;
	}

	private static createEmpty<T>(): PrefixTree<T> {
		const firstChild: number[] = [];
		const nextSibling: number[] = [];
		const edgeChar: number[] = [];
		const terminal: number[] = [];
		const leafValues: (T | undefined)[] = [];

		const allocNode = (char: number): number => {
			const id = firstChild.length;
			firstChild.push(NONE);
			nextSibling.push(NONE);
			edgeChar.push(char);
			terminal.push(0);
			leafValues.push(undefined);
			return id;
		};

		allocNode(0); // root

		return new PrefixTree(firstChild, nextSibling, edgeChar, terminal, leafValues);
	}

	private linkChild(parent: number, code: number): number {
		const id = this.firstChild.length;
		this.firstChild.push(NONE);
		this.nextSibling.push(NONE);
		this.edgeChar.push(code);
		this.terminal.push(0);
		this.leafValues.push(undefined);
		this.nextSibling[id] = this.firstChild[parent];
		this.firstChild[parent] = id;
		return id;
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
