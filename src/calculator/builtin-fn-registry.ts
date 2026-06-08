export type BuiltinFunctionArg = {
  name: string;
  doc: string;
};

export type BuiltinFunction = {
  name: string;
  arity: number;
  doc?: string;
  args?: readonly BuiltinFunctionArg[];
};

/*
Rules:
- name of an argument should tell what is it
- doc (description) should be concise
*/
export const BUILTIN_FUNCTIONS: readonly BuiltinFunction[] = [
  {
    name: 'sqrt',
    arity: 1,
    doc: 'Square root',
    args: [{ name: 'value', doc: 'Non-negative number' }],
  },
  {
    name: 'root',
    arity: 2,
    doc: 'n-th root',
    // radicand + index is the most mathematically precise naming.
    // Not sure most people know it, so I have changed it to simpler names.
    args: [
      { name: 'value', doc: 'Number whose root is computed' },
      { name: 'degree', doc: 'Which root (2 = square, 3 = cube, etc.)' },
    ],
  },
];

export const BUILTIN_FUNCTION_BY_NAME: ReadonlyMap<string, BuiltinFunction> =
  new Map(BUILTIN_FUNCTIONS.map((f) => [f.name, f]));

export type FunctionArgLabel = {
  name: string;
  doc: string;
};

/** Named args from the registry when available, otherwise generic `arg N` labels. */
export function getFunctionArgLabels(fnName: string, slotCount: number): FunctionArgLabel[] {
  const def = BUILTIN_FUNCTION_BY_NAME.get(fnName);
  const labels: FunctionArgLabel[] = [];
  for (let i = 0; i < slotCount; i++) {
    const meta = def?.args?.[i];
    labels.push(meta ?? { name: `arg ${i + 1}`, doc: '' });
  }
  return labels;
}
