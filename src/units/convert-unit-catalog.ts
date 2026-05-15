import { unitsObject } from "../../node_modules/convert/dist/generated/parse-unit.js";

/** Every unit spelling accepted by the `convert` package (names, symbols, aliases). */
const CONVERT_UNIT_SPELLINGS = Object.freeze(Object.keys(unitsObject));

const canonicalByLower = new Map<string, string>();
for (const unit of CONVERT_UNIT_SPELLINGS) {
  const lower = unit.toLowerCase();
  if (!canonicalByLower.has(lower)) canonicalByLower.set(lower, unit);
}

export function getConvertUnitSpellings(): readonly string[] {
  return CONVERT_UNIT_SPELLINGS;
}

/** Case-insensitive lookup to the canonical spelling used by `convert()`. */
export function normalizeConvertUnit(unit: string): string | null {
  return canonicalByLower.get(unit.toLowerCase()) ?? null;
}
