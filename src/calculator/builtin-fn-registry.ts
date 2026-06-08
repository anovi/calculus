export type BuiltinFunction = {
  name: string;
  arity: number;
  doc?: string;
  /** Args-only template, e.g. "()" or "(, )" — for future editor use */
  callTemplate?: string;
};

export const BUILTIN_FUNCTIONS: readonly BuiltinFunction[] = [
  { name: 'sqrt', arity: 1, doc: 'Square root', callTemplate: '()' },
  { name: 'root', arity: 2, doc: 'n-th root', callTemplate: '(, )' },
];

export const BUILTIN_FUNCTION_BY_NAME: ReadonlyMap<string, BuiltinFunction> =
  new Map(BUILTIN_FUNCTIONS.map((f) => [f.name, f]));
