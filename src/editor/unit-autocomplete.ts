import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

import { CURRENCIES } from '../units/currencies-list';
import { units } from '../units/internals/convert-package';
import type { MeasureEntry } from '../units/types';
import { terms } from '../language';

function canonicalApplyText(entry: MeasureEntry): string {
  return entry.symbols?.[0] ?? entry.names[0];
}

/** Rank these ISO codes higher among currency completions (code + name rows). */
const BOOSTED_CURRENCY_CODES = new Set(['USD', 'EUR']);
const CURRENCY_BOOST = 50;

/** Built once; each name/symbol (currencies: code + name) is its own option so CM can filter/score by `label`. */
const unitCompletionOptions: readonly Completion[] = (() => {
  const out: Completion[] = [];

  for (const entry of units) {
    const apply = canonicalApplyText(entry);
    const primaryName = entry.names[0];
    const seen = new Set<string>();

    const pushAlias = (label: string, detail: string) => {
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        label,
        detail,
        type: 'unit',
        apply,
      });
    };

    for (const name of entry.names) {
      const detail = name === apply ? primaryName : apply;
      pushAlias(name, detail);
    }
    if (entry.symbols) {
      for (const sym of entry.symbols) {
        const detail = sym === apply ? primaryName : apply;
        pushAlias(sym, detail);
      }
    }
  }

  for (const cur of CURRENCIES) {
    const boost = BOOSTED_CURRENCY_CODES.has(cur.code) ? CURRENCY_BOOST : undefined;
    const boosted = boost !== undefined ? { boost } : {};
    out.push({
      label: cur.code,
      detail: cur.name,
      type: 'unit',
      apply: cur.code,
      ...boosted,
    });
    out.push({
      label: cur.name,
      detail: cur.code,
      type: 'unit',
      apply: cur.code,
      ...boosted,
    });
  }

  return out;
})();

/** Convert targets: exclude inch `in` so it does not compete with the `in` operator. */
const unitCompletionOptionsForConvert: readonly Completion[] = unitCompletionOptions.filter(
  (c) => c.label.toLowerCase() !== 'in',
);

const UNIT_PREFIX = /[A-Za-z]*$/;
/** Number + space + partial unit (e.g. `100 us`); suffix without space uses the Unit node. */
const SUFFIX_UNIT_INPUT = /(\d+(?:\.\d+)?)\s+([A-Za-z]+)$/;

function unitPrefixAt(state: CompletionContext['state'], pos: number): { from: number; text: string } {
  const line = state.doc.lineAt(pos);
  const before = state.sliceDoc(line.from, pos);
  const match = before.match(UNIT_PREFIX);
  const text = match?.[0] ?? '';
  return { from: pos - text.length, text };
}

function unitNodeAt(state: CompletionContext['state'], pos: number): SyntaxNode | null {
  const tree = syntaxTree(state);
  for (const at of [pos, pos - 1]) {
    if (at < 0) continue;
    const node = tree.resolveInner(at, -1);
    if (node.type.id === terms.Unit && node.from <= pos && pos <= node.to) return node;
  }
  return null;
}

/** Innermost `ConvertExpression` whose target unit is being typed at `pos`. */
function convertExpressionAt(state: CompletionContext['state'], pos: number): SyntaxNode | null {
  let match: SyntaxNode | null = null;
  syntaxTree(state).iterate({
    enter(ref) {
      if (ref.type.id !== terms.ConvertExpression) return;
      const convertOp = ref.node.getChild(terms.ConvertOp);
      if (!convertOp || pos <= convertOp.to) return;
      match = ref.node;
    },
  });
  return match;
}

/** Completion range for the target unit in a `ConvertExpression` (after `ConvertOp`). */
function convertTargetFrom(
  state: CompletionContext['state'],
  convert: SyntaxNode,
  pos: number,
): number | null {
  const convertOp = convert.getChild(terms.ConvertOp);
  if (!convertOp || pos <= convertOp.to) return null;

  const prefix = unitPrefixAt(state, pos);
  const targetUnit = convert.getChild(terms.Unit);

  if (targetUnit && pos >= targetUnit.from) {
    return prefix.text.length > 0 ? prefix.from : targetUnit.from;
  }

  return prefix.text.length > 0 ? prefix.from : convertOp.to;
}

export type UnitCompletionSite =
  | { kind: 'suffix'; from: number }
  | { kind: 'convert'; from: number };

/** Where unit autocompletion should run, if anywhere. Exported for tests. */
function suffixSiteFromText(state: CompletionContext['state'], pos: number): UnitCompletionSite | null {
  const line = state.doc.lineAt(pos);
  const before = state.sliceDoc(line.from, pos);
  const match = before.match(SUFFIX_UNIT_INPUT);
  if (!match) return null;
  const unitText = match[2] ?? '';
  return { kind: 'suffix', from: pos - unitText.length };
}

export function unitCompletionSite(
  state: CompletionContext['state'],
  pos: number,
): UnitCompletionSite | null {
  const unit = unitNodeAt(state, pos);
  if (unit) {
    const kind =
      unit.parent?.type.id === terms.NumberWithUnit ? 'suffix' : 'convert';
    return { kind, from: unit.from };
  }

  const node = syntaxTree(state).resolveInner(pos, -1);
  for (let cur: SyntaxNode | null = node; cur; cur = cur.parent) {
    if (cur.type.id !== terms.NumberWithUnit) continue;
    const num = cur.getChild(terms.Number);
    if (!num || pos < num.to) continue;
    const prefix = unitPrefixAt(state, pos);
    if (prefix.text.length === 0 && pos > num.to) {
      const gap = state.sliceDoc(num.to, pos);
      if (!/^\s*$/.test(gap)) break;
    }
    return { kind: 'suffix', from: prefix.text.length > 0 ? prefix.from : pos };
  }

  const convert = convertExpressionAt(state, pos);
  if (convert) {
    const from = convertTargetFrom(state, convert, pos);
    if (from !== null) return { kind: 'convert', from };
  }

  return suffixSiteFromText(state, pos);
}

function optionsForSite(site: UnitCompletionSite): readonly Completion[] {
  return site.kind === 'convert' ? unitCompletionOptionsForConvert : unitCompletionOptions;
}

function unitCompletionResult(site: UnitCompletionSite, explicit: boolean): CompletionResult | null {
  const options = optionsForSite(site);
  if (options.length === 0 && !explicit) return null;

  return {
    from: site.from,
    options,
    update(_current, _from, _to, context) {
      const nextSite = unitCompletionSite(context.state, context.pos);
      if (!nextSite) return null;
      const nextPrefix = context.state.sliceDoc(nextSite.from, context.pos);
      if (!nextPrefix && !context.explicit) return null;
      return unitCompletionResult(nextSite, context.explicit);
    },
  };
}

export const unitCompletionSource: CompletionSource = (context): CompletionResult | null => {
  const site = unitCompletionSite(context.state, context.pos);
  if (!site) return null;

  const prefix = context.state.sliceDoc(site.from, context.pos);
  if (!prefix && !context.explicit) return null;

  return unitCompletionResult(site, context.explicit);
};

/** CodeMirror extension: unit/currency completions after number suffixes and convert targets. */
export function unitAutocompletion(): Extension {
  return autocompletion({ override: [unitCompletionSource] });
}
