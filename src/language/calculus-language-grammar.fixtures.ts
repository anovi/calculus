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
    LetBinding
      Identifier
      Expression
        Literal
          Number`,
},
{
name: 'expression binding',
doc: 'some = 2+2',
expectedTree: `CalcDoc
  Pipeline
    LetBinding
      Identifier
      Expression
        Expression
          Literal
            Number
        AddOp
        Expression
          Literal
            Number`,
	},
];
