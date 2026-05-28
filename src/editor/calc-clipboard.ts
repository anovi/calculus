import { EditorState, type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { EditorView } from '@codemirror/view'

import { CalcValue, MathCalculator } from '../calculator'
import { ratesStore } from '../rates-store'
import { calcSuffixResultPart, formatCalcSuffix } from './calc-result-format'
import { getCalcRanges } from './values-field'
import { calcLanguage } from './calculus-language'

function calcValueForSource(source: string): CalcValue | null {
    const state = EditorState.create({
        doc: source,
        extensions: [calcLanguage],
    });
    const tree = syntaxTree(state)
    const calculator = new MathCalculator(
        (from, to) => state.sliceDoc(from, to),
        ratesStore,
        state.doc,
    )
    const ranges = calculator.assemble(tree.cursor());
    if (!ranges?.length) return null;
    return ranges[0].value;
}

function calcSuffixForSourceInDoc(source: string, doc: string): string | null {
    const normalizedSource = normalizeCopiedLine(source);
    const state = EditorState.create({
        doc,
        extensions: [calcLanguage],
    });
    const tree = syntaxTree(state);
    const calculator = new MathCalculator(
        (from, to) => state.sliceDoc(from, to),
        ratesStore,
        state.doc,
    );
    const ranges = calculator.assemble(tree.cursor());
    if (!ranges?.length) return null;
    for (const range of ranges) {
        if (normalizeCopiedLine(state.sliceDoc(range.from, range.to)) === normalizedSource)
            return formatCalcSuffix(range.value);
    }
    return null;
}

function suffixForSource(source: string, state: EditorState): string | null {
    const normalizedSource = normalizeCopiedLine(source);
    const ranges = getCalcRanges(state);
    const cur = ranges.iter();
    while (cur.value) {
        const rangeSource = normalizeCopiedLine(state.sliceDoc(cur.from, cur.to));
        if (rangeSource === normalizedSource) {
            return formatCalcSuffix(cur.value);
        }
        cur.next();
    }
    const value = calcValueForSource(normalizedSource);
    return value ? formatCalcSuffix(value) : null;
}

function suffixForSourceWithContext(
    source: string,
    expectedRight: string,
    state: EditorState,
    previousLines: string[],
): string | null {
    const direct = suffixForSource(source, state);
    if (direct && expectedRight === calcSuffixResultPart(direct)) return direct;
    const contextualDoc = [...previousLines, source].join(state.lineBreak);
    const contextual = calcSuffixForSourceInDoc(source, contextualDoc);
    if (contextual && expectedRight === calcSuffixResultPart(contextual)) {
        return contextual;
    }
    return null;
}

/** Skip when the line already shows the result after its last ` = `. */
function isSuffixRedundant(line: string, suffix: string): boolean {
    const idx = line.lastIndexOf(' = ');
    if (idx === -1) return false;
    return line.slice(idx + 3).trim() === calcSuffixResultPart(suffix);
}

function normalizeCopiedLine(line: string): string {
    return line.trim();
}

function getSelectionIntervals(state: EditorState): Array<{ from: number; to: number }> {
    return state.selection.ranges.map((range) => {
        if (!range.empty) {
            const from = Math.min(range.anchor, range.head);
            const to = Math.max(range.anchor, range.head);
            return { from, to };
        }
        // Empty selection => CodeMirror copies whole current line.
        const line = state.doc.lineAt(range.from);
        return { from: line.from, to: Math.min(state.doc.length, line.to + 1) };
    });
}

function inAnySelection(from: number, to: number, intervals: Array<{ from: number; to: number }>): boolean {
    return intervals.some((sel) => from >= sel.from && to - 1 <= sel.to);
}

function buildCopiedLineSuffixQueues(state: EditorState): Map<string, string[]> {
    const queues = new Map<string, string[]>();
    const ranges = getCalcRanges(state);
    const intervals = getSelectionIntervals(state);
    ranges.between(0, state.doc.length, (from, to, value) => {
        if (!inAnySelection(from, to, intervals)) return;
        const sourceLine = normalizeCopiedLine(state.sliceDoc(from, to));
        const suffix = formatCalcSuffix(value);
        if (!suffix || isSuffixRedundant(sourceLine, suffix)) return;
        const queue = queues.get(sourceLine) ?? [];
        queue.push(suffix);
        queues.set(sourceLine, queue);
    });
    return queues;
}

function enrichCopyLine(line: string, suffixQueues: Map<string, string[]>): string {
    const queue = suffixQueues.get(normalizeCopiedLine(line));
    const suffix = queue?.shift();
    if (!suffix) return line;
    return `${line} ${suffix}`;
}

function copyOutputFilter(text: string, state: EditorState): string {
    const suffixQueues = buildCopiedLineSuffixQueues(state);
    if (suffixQueues.size === 0) return text;
    const parts = text.split(/\r\n|\n|\r/);
    const mapped = parts.map((line) => enrichCopyLine(line, suffixQueues));
    const lineBreak = state.lineBreak;
    return mapped.join(lineBreak === '\n' && text.includes('\r\n') ? '\r\n' : lineBreak);
}

function pasteInputFilter(text: string, state: EditorState): string {
    if (!text) return text;
    const parts = text.split(/\r\n|\n|\r/);
    const processed: string[] = [];
    for (const line of parts) {
        const idx = line.lastIndexOf(' = ');
        if (idx === -1) {
            processed.push(line);
            continue;
        }
        const left = line.slice(0, idx);
        const right = line.slice(idx + 3);
        const suffix = suffixForSourceWithContext(left, right, state, processed);
        processed.push(suffix && right === calcSuffixResultPart(suffix) ? left : line);
    }
    const lineBreak = state.lineBreak;
    return processed.join(lineBreak === '\n' && text.includes('\r\n') ? '\r\n' : lineBreak);
}

/** Copy/paste filters: copy includes ` = result`; paste strips a matching trailing result. */
export function calcClipboard(): Extension {
    return [
        EditorView.clipboardOutputFilter.of(copyOutputFilter),
        EditorView.clipboardInputFilter.of(pasteInputFilter),
    ]
}
