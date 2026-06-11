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

const AGGREGATION_NAMES = ['sum', 'average', 'median'] as const;

export const FUNCTION_MENU_SECTIONS: readonly FunctionMenuSection[] = [
  {
    id: 'general',
    label: 'General math',
    functions: BUILTIN_FUNCTIONS.filter(
      (fn) => !fn.aggregatesGroup && !ALIAS_NAMES.has(fn.name),
    ),
  },
  {
    id: 'aggregation',
    label: 'Aggregation',
    intro:
      'Summarize the lines above within a group. Groups are separated by blank lines.',
    functions: AGGREGATION_NAMES.map((name) => BUILTIN_FUNCTION_BY_NAME.get(name)!),
  },
];
