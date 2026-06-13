import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';

import {
  areUnitsCompatible,
  getCurrencies,
  getMeasurementUnits,
  normalizeUnit,
  type MeasureEntry,
} from '../../units';
import { terms } from '../../language';
import { skipWhiteSpaceBackward } from '../editor-commands';
import { functionCallContextAt } from '../function-args/function-args-context';
import { completionApplyWithArgAdvance } from '../function-args/function-args-completion';

function canonicalApplyText(entry: MeasureEntry): string {
  return entry.symbols?.[0] ?? entry.names[0];
}

/** Rank these ISO codes higher among currency completions (code + name rows). */
const BOOSTED_CURRENCY_CODES = new Set(['USD', 'EUR']);
const CURRENCY_BOOST = 50;

/** Built once; each name/symbol (currencies: code + name) is its own option so CM can filter/score by `label`. */
const unitCompletionOptions: readonly Completion[] = (() => {
  const out: Completion[] = [];

  for (const entry of getMeasurementUnits()) {
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

  for (const cur of getCurrencies()) {
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

/** Number + space + partial unit (e.g. `100 us`); suffix without space uses the Unit node. */
const SUFFIX_UNIT_INPUT = /(\d+(?:\.\d+)?)\s+([A-Za-z]+)$/;

function normalizedUnitFromNode(
  state: CompletionContext['state'],
  unitNode: SyntaxNode,
): string | null {
  const raw = state.sliceDoc(unitNode.from, unitNode.to);
  const normalized = normalizeUnit(raw);
  if (normalized == null || Array.isArray(normalized)) return null;
  return normalized;
}

function unitFromExpression(
  state: CompletionContext['state'],
  node: SyntaxNode,
): string | null {
  switch (node.type.id) {
    case terms.NumberWithUnit: {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.type.id === terms.Unit) {
          return normalizedUnitFromNode(state, child);
        }
      }
      return null;
    }
    case terms.Literal: {
      const child = node.firstChild;
      return child ? unitFromExpression(state, child) : null;
    }
    case terms.ConvertExpression: {
      for (let child = node.lastChild; child; child = child.prevSibling) {
        if (child.type.id === terms.Unit) {
          return normalizedUnitFromNode(state, child);
        }
      }
      return null;
    }
    case terms.AddExpression:
    case terms.MulExpression:
    case terms.ExpExpression: {
      for (let child = node.lastChild; child; child = child.prevSibling) {
        if (
          child.type.id === terms.PlusBinaryOp ||
          child.type.id === terms.TimesBinaryOp ||
          child.type.id === terms.PowBinaryOp
        ) {
          continue;
        }
        const unit = unitFromExpression(state, child);
        if (unit) return unit;
      }
      return null;
    }
    default:
      return null;
  }
}

function convertExpressionAtTarget(
  state: CompletionContext['state'],
  pos: number,
): SyntaxNode | null {
  const tree = syntaxTree(state);

  const unit = unitNodeAt(state, pos);
  if (unit?.parent?.type.id === terms.ConvertExpression) {
    return unit.parent;
  }

  for (const at of [pos, pos - 1]) {
    if (at < 0) continue;
    const node = tree.resolveInner(at, -1);
    if (node.type.id === terms.Unit && node.parent?.type.id === terms.ConvertExpression) {
      return node.parent;
    }
    if (node.type.id === terms.Identifier) {
      const prev = tree.resolveInner(skipWhiteSpaceBackward(state, node.from), -1);
      if (prev?.type.id === terms.ConvertOp) {
        const convertExpr = prev.parent;
        if (convertExpr?.type.id === terms.ConvertExpression) {
          return convertExpr;
        }
      }
    }
  }

  return null;
}

/** Canonical source unit for a convert-target position, or null when unknown / absent. */
export function sourceUnitForConvertTarget(
  state: CompletionContext['state'],
  pos: number,
): string | null {
  const convertExpr = convertExpressionAtTarget(state, pos);
  if (!convertExpr) return null;
  const valueExpr = convertExpr.firstChild;
  if (!valueExpr || valueExpr.type.id === terms.ConvertOp) return null;
  return unitFromExpression(state, valueExpr);
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
  const tree = syntaxTree(state);
  
  let boundaryPos = skipWhiteSpaceBackward(state, pos);
  const node = tree.resolveInner(boundaryPos, -1);

  let prevNode: SyntaxNode|undefined = undefined;
  if (boundaryPos === pos) {
    // icomplete units parsed as Identifier
    if (node.type.id === terms.Identifier) {
      boundaryPos = skipWhiteSpaceBackward(state, node.from);
      prevNode = tree.resolveInner(boundaryPos, -1);
    }
  }

  // Incomplete unit after a conversion expression
  if (prevNode && (prevNode.type.id === terms.ConvertOp)) {
    return { kind: 'convert', from: node.from };
  }

  const unit = unitNodeAt(state, pos);
  if (unit) {
    const kind =
      unit.parent?.type.id === terms.NumberWithUnit ? 'suffix' : 'convert';
    return { kind, from: unit.from };
  }

  return suffixSiteFromText(state, pos);
}

function optionsForSite(
  state: CompletionContext['state'],
  site: UnitCompletionSite,
  pos: number,
): readonly Completion[] {
  const base =
    site.kind === 'convert' ? unitCompletionOptionsForConvert : unitCompletionOptions;

  if (site.kind !== 'convert') return base;

  const sourceUnit = sourceUnitForConvertTarget(state, pos);
  if (!sourceUnit) return base;

  return base.filter((option) => {
    const candidate = typeof option.apply === 'string' ? option.apply : option.label;
    return areUnitsCompatible(sourceUnit, candidate);
  });
}

function optionsWithArgAdvance(
  state: CompletionContext['state'],
  from: number,
  options: readonly Completion[],
): readonly Completion[] {
  if (functionCallContextAt(state, from) == null) return options;
  return options.map((option) => {
    const insert =
      typeof option.apply === 'string' ? option.apply : option.label;
    return { ...option, apply: completionApplyWithArgAdvance(insert) };
  });
}

function unitCompletionResult(
  state: CompletionContext['state'],
  site: UnitCompletionSite,
  pos: number,
  explicit: boolean,
): CompletionResult | null {
  const options = optionsWithArgAdvance(state, site.from, optionsForSite(state, site, pos));
  if (options.length === 0 && !explicit) return null;

  return {
    from: site.from,
    options,
    update(_current, _from, _to, context) {
      const nextSite = unitCompletionSite(context.state, context.pos);
      if (!nextSite) return null;
      const nextPrefix = context.state.sliceDoc(nextSite.from, context.pos);
      if (!nextPrefix && !context.explicit) return null;
      return unitCompletionResult(context.state, nextSite, context.pos, context.explicit);
    },
  };
}

export const unitCompletionSource: CompletionSource = (context): CompletionResult | null => {
  const site = unitCompletionSite(context.state, context.pos);
  if (!site) return null;

  const prefix = context.state.sliceDoc(site.from, context.pos);
  if (!prefix && !context.explicit) return null;

  return unitCompletionResult(context.state, site, context.pos, context.explicit);
};