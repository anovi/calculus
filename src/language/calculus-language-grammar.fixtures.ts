export type ParseFixture = {
	name: string;
	doc: string;
	expectedTree: string;
  only?: boolean;
  skip?: boolean;
};

export const parseFixtures: readonly ParseFixture[] = [
{
name: 'simple binding',
doc: 'some = 123',
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      Literal
        Number`,
},
{
name: 'value with unit',
doc: '100USD',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        NumberWithUnit
          Number
          Unit`,
},
{
name: 'value with lowercase unit',
doc: '100 usd',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        NumberWithUnit
          Number
          Unit`,
},
{
name: 'binding with value and unit',
doc: 'w = 12 EUR',
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      Literal
        NumberWithUnit
          Number
          Unit`,
},
{
name: 'unit convertion',
doc: '12 EUR in Usd',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      ConvertExpression
        Literal
          NumberWithUnit
            Number
            Unit
        ConvertOp
        Unit`,
},
{
name: 'conversion before addition',
doc: '23 EUR in USD + 10',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      AddExpression
        ConvertExpression
          Literal
            NumberWithUnit
              Number
              Unit
          ConvertOp
          Unit
        PlusBinaryOp
        Literal
          Number`,
},
{
name: 'standalone convert keyword in (not a Unit)',
doc: '12 in USD',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      ConvertExpression
        Literal
          Number
        ConvertOp
        Unit`,
},
{
name: 'standalone convert keyword in with tab (not a Unit)',
doc: '12	in USD',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      ConvertExpression
        Literal
          Number
        ConvertOp
        Unit`,
},
{
name: 'suffix `in` recognized as Unit',
doc: '12in',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        NumberWithUnit
          Number
          Unit`,
},
{
name: 'with double unit convertion',
doc: '12 EUR in USD in RSD',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      ConvertExpression
        ConvertExpression
          Literal
            NumberWithUnit
              Number
              Unit
          ConvertOp
          Unit
        ConvertOp
        Unit`,
},
{
name: 'float',
doc: '0.123',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'integer with comma separators',
doc: '1,233,232',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'float with comma separators',
doc: '1,233,232.232',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'integer with underscore separators',
doc: '1_233_232',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'float with underscore separators',
doc: '1_233_232.232',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'scientific notation integer',
doc: '1.23e-7',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'scientific notation uppercase E',
doc: '1E+10',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'scientific notation without fractional part',
doc: '2e10',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number`,
},
{
name: 'scientific notation with unit',
doc: '1.5e3 km',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        NumberWithUnit
          Number
          Unit`,
},
{
name: 'float with underscore in fractional part is invalid',
doc: '1_233_232.232_333',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number
      ⚠
    NoBinding
      Identifier`,
},
{
name: 'float with comma in fractional part is invalid',
doc: '1,233,232.232,333',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number
        ⚠
      ⚠
    NoBinding
      Literal
        Number`,
},
{
name: 'expression binding',
doc: 'some = 2+2',
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      AddExpression
        Literal
          Number
        PlusBinaryOp
        Literal
          Number`,
},
{
name: 'exponent',
doc: '2^4',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      ExpExpression
        Literal
          Number
        PowBinaryOp
        Literal
          Number`,
},
{
name: 'percent add',
doc: '100 + 20%',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      AddExpression
        Literal
          Number
        PlusBinaryOp
        Literal
          PercentLiteral
            Number
            PercentSuffix`,
},
{
name: 'precedence exponent over multiply',
doc: '2 * 2 ^ 3',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      MulExpression
        Literal
          Number
        TimesBinaryOp
        ExpExpression
          Literal
            Number
          PowBinaryOp
          Literal
            Number`,
},
{
name: 'precedence with times',
doc: '- 3 + 2 * 10',
expectedTree: `CalcDoc
  StatementGroup
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
  StatementGroup
    NoBinding
      MulExpression
        Opr
        AddExpression
          Literal
            Number
          PlusBinaryOp
          Literal
            Number
        Cpr
        TimesBinaryOp
        Literal
          Number`,
},
{
name: 'multiple lines',
doc: `some = 2 + 2
10`,
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
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
doc: `some = 10
other = some + 2`,
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      Literal
        Number
    Binding
      Identifier
      EqualSign
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
  StatementGroup
    NoBinding
      FunctionCall
        Identifier
        Opr
        ArgList
          Literal
            Number
        Cpr`,
},
{
name: 'function call with no args',
doc: 'sqrt()',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      FunctionCall
        Identifier
        Opr
        Cpr`,
},
{
name: 'function call in addition',
doc: '2 + sqrt(16)',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      AddExpression
        Literal
          Number
        PlusBinaryOp
        FunctionCall
          Identifier
          Opr
          ArgList
            Literal
              Number
          Cpr`,
},
{
name: 'function call multiple args',
doc: 'sqrt(1, 4)',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      FunctionCall
        Identifier
        Opr
        ArgList
          Literal
            Number
          Literal
            Number
        Cpr`,
},
{
name: 'incomplete expression',
doc: `some =

13 usd in rub`,
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      ⚠
  StatementGroup
    NoBinding
      ConvertExpression
        Literal
          NumberWithUnit
            Number
            Unit
        ConvertOp
        Unit`,
},
{
name: 'comment line',
doc: '// 232 + 232',
expectedTree: `CalcDoc
  StatementGroup
    CommentLine
      Comment`,
},
{
name: 'expression with trailing comment',
doc: '2 + 2 // some',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      AddExpression
        Literal
          Number
        PlusBinaryOp
        Literal
          Number
      Comment`,
},
{
name: 'heading',
doc: '# 232 + 232',
expectedTree: `CalcDoc
  StatementGroup
    Heading`,
},
{
name: 'statements separated by blank line',
doc: `a = 1

b = 2`,
expectedTree: `CalcDoc
  StatementGroup
    Binding
      Identifier
      EqualSign
      Literal
        Number
  StatementGroup
    Binding
      Identifier
      EqualSign
      Literal
        Number`,
},
{
name: 'comment line should not break group',
doc: '2\n//comment\n2',
expectedTree: `CalcDoc
  StatementGroup
    NoBinding
      Literal
        Number
    CommentLine
      Comment
    NoBinding
      Literal
        Number`,
},
];
