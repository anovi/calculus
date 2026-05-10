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
  Pipeline
    Binding
      Identifier
      Literal
        Number`,
},
{
name: 'expression binding',
doc: 'some = 2+2',
expectedTree: `CalcDoc
  Pipeline
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
  Pipeline
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
];
