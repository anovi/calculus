import {
  BUILTIN_FUNCTIONS,
  BUILTIN_FUNCTION_ALIASES,
  BUILTIN_FUNCTION_BY_NAME,
  type BuiltinFunction,
} from '../calculator';

export type FunctionMenuSection = {
  id: string;
  label: string;
  intro?: string;
  functions: readonly BuiltinFunction[];
};

const ALIAS_NAMES = new Set(BUILTIN_FUNCTION_ALIASES.keys());

function sectionFunctions(names: readonly string[]): readonly BuiltinFunction[] {
  return names.map((name) => {
    const fn = BUILTIN_FUNCTION_BY_NAME.get(name);
    if (!fn) throw new Error(`Unknown builtin function: ${name}`);
    return fn;
  });
}

const MENU_SECTION_DEFS: readonly {
  id: string;
  label: string;
  intro?: string;
  names: readonly string[];
}[] = [
  {
    id: 'everyday',
    label: 'Everyday',
    names: ['sqrt', 'abs', 'floor', 'round', 'ceil', 'trunc', 'num', 'pow'],
  },
  {
    id: 'totals',
    label: 'Summary functions',
    intro:
      'Use a group of lines above them. Groups are separated by blank lines.',
    names: ['sum', 'average', 'median'],
  },
  {
    id: 'compare-limit',
    label: 'Compare & limit',
    names: ['min', 'max', 'clamp'],
  },
  {
    id: 'more-roots',
    label: 'More roots',
    names: ['cbrt', 'root'],
  },
  {
    id: 'trigonometry',
    label: 'Trigonometry',
    names: ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2'],
  },
  {
    id: 'exponents-logs',
    label: 'Exponents & logs',
    names: ['exp', 'ln', 'log10', 'log2', 'log'],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    names: ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'hypot'],
  },
];

export const FUNCTION_MENU_SECTIONS: readonly FunctionMenuSection[] =
  MENU_SECTION_DEFS.map((section) => ({
    id: section.id,
    label: section.label,
    intro: section.intro,
    functions: sectionFunctions(section.names),
  }));

const menuFunctionNames = new Set(
  FUNCTION_MENU_SECTIONS.flatMap((section) =>
    section.functions.map((fn) => fn.name),
  ),
);

for (const fn of BUILTIN_FUNCTIONS) {
  if (ALIAS_NAMES.has(fn.name)) continue;
  if (!menuFunctionNames.has(fn.name)) {
    throw new Error(`Function "${fn.name}" is missing from the functions menu`);
  }
}
