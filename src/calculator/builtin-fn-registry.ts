export type BuiltinFunctionArg = {
  name: string;
  doc: string;
};

export type BuiltinFunction = {
  name: string;
  arity: number;
  doc?: string;
  args?: readonly BuiltinFunctionArg[];
  /** Zero-arg function that aggregates preceding lines in the current StatementGroup. */
  aggregatesGroup?: boolean;
};

/*
Rules:
- name of an argument should tell what is it
- doc (description) should be concise
*/
export const BUILTIN_FUNCTIONS: readonly BuiltinFunction[] = [
  {
    name: 'abs',
    arity: 1,
    doc: 'Distance from zero',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'ceil',
    arity: 1,
    doc: 'Round up to a whole number',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'floor',
    arity: 1,
    doc: 'Round down to a whole number',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'round',
    arity: 1,
    doc: 'Round to the nearest whole number',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'trunc',
    arity: 1,
    doc: 'Drop the decimal part',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'sqrt',
    arity: 1,
    doc: 'Square root',
    args: [{ name: 'value', doc: 'Non-negative number' }],
  },
  {
    name: 'cbrt',
    arity: 1,
    doc: 'Cube root',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'root',
    arity: 2,
    doc: 'n-th root',
    // radicand + index is the most mathematically precise naming.
    // Not sure most people know it, so I have changed it to simpler names.
    args: [
      { name: 'value', doc: 'Number whose root is computed' },
      { name: 'root', doc: 'Which root to take (2 = square, 3 = cubic, etc.)' },
    ],
  },
  {
    name: 'pow',
    arity: 2,
    doc: 'Raise to a power',
    args: [
      { name: 'base', doc: 'Number to raise' },
      { name: 'exponent', doc: 'Power to raise it to' },
    ],
  },
  {
    name: 'min',
    arity: 2,
    doc: 'Smaller of two numbers',
    args: [
      { name: 'first', doc: 'First number' },
      { name: 'second', doc: 'Second number' },
    ],
  },
  {
    name: 'max',
    arity: 2,
    doc: 'Larger of two numbers',
    args: [
      { name: 'first', doc: 'First number' },
      { name: 'second', doc: 'Second number' },
    ],
  },
  {
    name: 'clamp',
    arity: 3,
    doc: 'Keep a number within a range',
    args: [
      { name: 'value', doc: 'Number to limit' },
      { name: 'minimum', doc: 'Smallest allowed value' },
      { name: 'maximum', doc: 'Largest allowed value' },
    ],
  },
  {
    name: 'sin',
    arity: 1,
    doc: 'Sine of an angle',
    args: [{ name: 'angle', doc: 'Angle in radians' }],
  },
  {
    name: 'cos',
    arity: 1,
    doc: 'Cosine of an angle',
    args: [{ name: 'angle', doc: 'Angle in radians' }],
  },
  {
    name: 'tan',
    arity: 1,
    doc: 'Tangent of an angle',
    args: [{ name: 'angle', doc: 'Angle in radians' }],
  },
  {
    name: 'asin',
    arity: 1,
    doc: 'Angle whose sine is the given value',
    args: [{ name: 'value', doc: 'Number from -1 to 1' }],
  },
  {
    name: 'acos',
    arity: 1,
    doc: 'Angle whose cosine is the given value',
    args: [{ name: 'value', doc: 'Number from -1 to 1' }],
  },
  {
    name: 'atan',
    arity: 1,
    doc: 'Angle whose tangent is the given value',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'atan2',
    arity: 2,
    doc: 'Angle from x and y coordinates',
    args: [
      { name: 'y', doc: 'Vertical coordinate' },
      { name: 'x', doc: 'Horizontal coordinate' },
    ],
  },
  {
    name: 'sinh',
    arity: 1,
    doc: 'Hyperbolic sine',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'cosh',
    arity: 1,
    doc: 'Hyperbolic cosine',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'tanh',
    arity: 1,
    doc: 'Hyperbolic tangent',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'asinh',
    arity: 1,
    doc: 'Inverse hyperbolic sine',
    args: [{ name: 'value', doc: 'Number' }],
  },
  {
    name: 'acosh',
    arity: 1,
    doc: 'Inverse hyperbolic cosine',
    args: [{ name: 'value', doc: 'Number at least 1' }],
  },
  {
    name: 'atanh',
    arity: 1,
    doc: 'Inverse hyperbolic tangent',
    args: [{ name: 'value', doc: 'Number from -1 to 1' }],
  },
  {
    name: 'exp',
    arity: 1,
    doc: 'e raised to a power',
    args: [{ name: 'exponent', doc: 'Number' }],
  },
  {
    name: 'ln',
    arity: 1,
    doc: 'Natural logarithm',
    args: [{ name: 'value', doc: 'Positive number' }],
  },
  {
    name: 'log10',
    arity: 1,
    doc: 'Logarithm (base 10)',
    args: [{ name: 'value', doc: 'Positive number' }],
  },
  {
    name: 'log2',
    arity: 1,
    doc: 'Logarithm (base 2)',
    args: [{ name: 'value', doc: 'Positive number' }],
  },
  {
    name: 'log',
    arity: 2,
    doc: 'Logarithm with a chosen base',
    args: [
      { name: 'value', doc: 'Positive number' },
      { name: 'base', doc: 'Base of the logarithm' },
    ],
  },
  {
    name: 'hypot',
    arity: 2,
    doc: 'Length of the hypotenuse',
    args: [
      { name: 'side a', doc: 'First side of a right triangle' },
      { name: 'side b', doc: 'Second side of a right triangle' },
    ],
  },
  {
    name: 'sum',
    arity: 0,
    aggregatesGroup: true,
    doc: 'Sum of preceding lines in this group',
  },
  {
    name: 'total',
    arity: 0,
    aggregatesGroup: true,
    doc: 'Sum of preceding lines in this group',
  },
  {
    name: 'average',
    arity: 0,
    aggregatesGroup: true,
    doc: 'Average of preceding lines in this group',
  },
  {
    name: 'avg',
    arity: 0,
    aggregatesGroup: true,
    doc: 'Average of preceding lines in this group',
  },
  {
    name: 'median',
    arity: 0,
    aggregatesGroup: true,
    doc: 'Median of preceding lines in this group',
  },
];

/** Canonical builtin name when `name` is an aggregation alias. */
export const BUILTIN_FUNCTION_ALIASES: ReadonlyMap<string, string> = new Map([
  ['total', 'sum'],
  ['avg', 'average'],
]);

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
