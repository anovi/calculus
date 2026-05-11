export type ParseFixture = {
	name: string;
	doc: string;
	expectedTree: string;
};

export const parseFixtures: readonly ParseFixture[] = [
{
name: 'simple binding',
doc: 'some = 123',
expectedTree: `CalcDoc
  Binding
    Identifier
    Literal
      Number`,
},
{
name: 'float',
doc: '0.123',
expectedTree: `CalcDoc
  NoBinding
    Literal
      Number`,
},
{
name: 'expression binding',
doc: 'some = 2+2',
expectedTree: `CalcDoc
  Binding
    Identifier
    AddExpression
      Literal
        Number
      PlusBinaryOp
      Literal
        Number`,
},
{
name: 'precedence with times',
doc: '- 3 + 2 * 10',
expectedTree: `CalcDoc
  NoBinding
    AddExpression
      AddExpression
        PlusBinaryOp
        Literal
          Number
      PlusBinaryOp
      MulExpression
        Literal
          Number
        TimesBinaryOp
        Literal
          Number`,
},
{
name: 'precedence with grouping',
doc: '(3 + 2) * 10',
expectedTree: `CalcDoc
  NoBinding
    MulExpression
      AddExpression
        Literal
          Number
        PlusBinaryOp
        Literal
          Number
      TimesBinaryOp
      Literal
        Number`,
},
{
name: 'multiple lines',
doc: 'some = 2 + 2\n10',
expectedTree: `CalcDoc
  Binding
    Identifier
    AddExpression
      Literal
        Number
      PlusBinaryOp
      Literal
        Number
  NoBinding
    Literal
      Number`,
},
{
name: 'expression with binded value',
doc: 'some = 10\nother = some + 2',
expectedTree: `CalcDoc
  Binding
    Identifier
    Literal
      Number
  Binding
    Identifier
    AddExpression
      Identifier
      PlusBinaryOp
      Literal
        Number`,
},
{
  name: 'function call sqrt',
  doc: 'sqrt(16)',
  expectedTree: `CalcDoc
  NoBinding
    FunctionCall
      Identifier
      ArgList
        Literal
          Number`,
},
{
  name: 'function call with no args',
  doc: 'sqrt()',
  expectedTree: `CalcDoc
  NoBinding
    FunctionCall
      Identifier`,
},
{
  name: 'function call in addition',
  doc: '2 + sqrt(16)',
  expectedTree: `CalcDoc
  NoBinding
    AddExpression
      Literal
        Number
      PlusBinaryOp
      FunctionCall
        Identifier
        ArgList
          Literal
            Number`,
},
{
  name: 'function call multiple args',
  doc: 'sqrt(1, 4)',
  expectedTree: `CalcDoc
  NoBinding
    FunctionCall
      Identifier
      ArgList
        Literal
          Number
        Literal
          Number`,
},
];
