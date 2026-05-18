import { PrefixTree } from "../lib/prefix-tree"
import { units } from "./internals/convert-package"
import { CURRENCIES } from "./currencies-list";
import { type MeasureEntry, UnitType } from "./types"


export const allUnitVocabluary = PrefixTree.empty<MeasureEntry>();

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })

// Build units
for (const entry of units) {
    for (let index = 0; index < entry.names.length; index++) {
        const name = entry.names[index];
        allUnitVocabluary.addWord(name, entry);
    }
    if (!entry.symbols) continue;
    for (let index = 0; index < entry.symbols.length; index++) {
        // for (const seg of segmenter.segment(entry.symbols[index])) {
        //     if (seg.isWordLike) console.log(seg.segment)
        // }
        const sym = entry.symbols[index];
        allUnitVocabluary.addWord(sym, entry);
    }
}

// Build currencies
for (const entry of CURRENCIES) {
    const mEntry: MeasureEntry = {
        type: UnitType.currency,
        names: [entry.name],
        symbols: [entry.code],
    }
    allUnitVocabluary.addWord(entry.code, mEntry);
    allUnitVocabluary.addWord(entry.name, mEntry);
    // for (const seg of segmenter.segment(entry.name)) {
    //     // if (seg.isWordLike) console.log(seg.segment)
    //     // if (seg.isWordLike) {
    //     //     allUnitVocabluary.addWord(seg.segment, mEntry);
    //     // }
    // }
}