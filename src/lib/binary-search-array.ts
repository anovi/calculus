/**
 * Case-insensitive membership in a sorted string array via binary search.
 */
export class BinarySearchArray {
	private readonly words: readonly string[];

	private constructor(words: readonly string[]) {
		this.words = words;
	}

	/** Builds a sorted array from the given strings (matching is case-insensitive). */
	static fromWords(words: readonly string[]): BinarySearchArray {
		const sorted = [...words].sort((a, b) => a.localeCompare(b));
		return new BinarySearchArray(sorted);
	}

	hasWord(query: string): boolean {
		const key = query.toLowerCase();
		let lo = 0;
		let hi = this.words.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >>> 1;
			const word = this.words[mid]!;
			if (word < key) lo = mid + 1;
			else if (word > key) hi = mid - 1;
			else return true;
		}
		return false;
	}
}
