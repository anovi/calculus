import { PrefixTree } from "../lib/prefix-tree";
import { CURRENCY_CODES } from "./currencies-list";
import { CANONICAL_UNIT_SPELLINGS } from "./unit-name-normalizer";


/** All units/currencies (`100USD`, standalone `EUR` in convert targets). */
export const unitsPrefixTrie = PrefixTree.fromWords([
    ...CURRENCY_CODES,
    ...CANONICAL_UNIT_SPELLINGS
]);