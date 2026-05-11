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
name: 'expression binding',
doc: 'some = 2+2',
expectedTree: `CalcDoc
  Binding
    Identifier
    AddExpression
      Literal
        Number
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
        Literal
          Number
      MulExpression
        Literal
          Number
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
        Literal
          Number
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
      Literal
        Number
  NoBinding
    Literal
      Number`,
},
];
