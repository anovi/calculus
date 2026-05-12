import assert from "node:assert";
import { PrefixTree } from "./prefix-tree";

describe("PrefixTree", () => {
	it("builds from an empty word list", () => {
		const trie = PrefixTree.fromWords([]);
		assert.strictEqual(trie.nodeCount, 1);
		assert.strictEqual(trie.hasWord(""), false);
		assert.strictEqual(trie.hasPrefix(""), true);
	});

	it("stores and matches a single word", () => {
		const trie = PrefixTree.fromWords(["hello"]);
		assert.strictEqual(trie.hasWord("hello"), true);
		assert.strictEqual(trie.hasWord("hell"), false);
		assert.strictEqual(trie.hasPrefix("hell"), true);
		assert.strictEqual(trie.hasPrefix("hello"), true);
		assert.strictEqual(trie.hasPrefix("hellox"), false);
	});

	it("is case-insensitive for insert and query", () => {
		const trie = PrefixTree.fromWords(["Usd", "EUR"]);
		assert.strictEqual(trie.hasWord("usd"), true);
		assert.strictEqual(trie.hasWord("USD"), true);
		assert.strictEqual(trie.hasWord("Usd"), true);
		assert.strictEqual(trie.hasWord("eur"), true);
		assert.strictEqual(trie.hasWord("Eur"), true);
		assert.strictEqual(trie.hasPrefix("us"), true);
		assert.strictEqual(trie.hasPrefix("EU"), true);
	});

	it("shares prefixes between words", () => {
		const trie = PrefixTree.fromWords(["ab", "abc", "abd"]);
		assert.strictEqual(trie.hasWord("ab"), true);
		assert.strictEqual(trie.hasWord("abc"), true);
		assert.strictEqual(trie.hasWord("abd"), true);
		assert.strictEqual(trie.hasWord("a"), false);
		assert.strictEqual(trie.hasPrefix("a"), true);
		assert.strictEqual(trie.hasPrefix("ab"), true);
	});

	it("treats duplicate words as a single terminal", () => {
		const trie = PrefixTree.fromWords(["x", "x", "X"]);
		assert.strictEqual(trie.hasWord("x"), true);
		assert.strictEqual(trie.nodeCount, 2); // root + one 'x' node
	});

	it("supports non-ascii code points via toLowerCase", () => {
		const trie = PrefixTree.fromWords(["Résumé"]);
		assert.strictEqual(trie.hasWord("résumé"), true);
		assert.strictEqual(trie.hasWord("RÉSUMÉ"), true);
	});

	describe("longestMatchUtf16", () => {
		const fromString = (s: string) => (offset: number) => {
			if (offset >= s.length) return -1;
			return s.charCodeAt(offset);
		};

		it("returns 0 when nothing matches", () => {
			const trie = PrefixTree.fromWords(["usd"]);
			assert.strictEqual(trie.longestMatchUtf16(fromString("xyz")), 0);
		});

		it("prefers the longest word when one is a prefix of another", () => {
			const trie = PrefixTree.fromWords(["he", "hello"]);
			assert.strictEqual(trie.longestMatchUtf16(fromString("hello")), 5);
			assert.strictEqual(trie.longestMatchUtf16(fromString("hex")), 2);
		});

		it("is case-insensitive for UTF-16 scan", () => {
			const trie = PrefixTree.fromWords(["EUR"]);
			assert.strictEqual(trie.longestMatchUtf16(fromString("eur")), 3);
			assert.strictEqual(trie.longestMatchUtf16(fromString("EuR")), 3);
		});
	});
});
