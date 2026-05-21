export type FormatLineFixture = {
	name: string;
	doc: string;
	expected: string;
	only?: boolean;
	skip?: boolean;
};

/**
 * Single-line inputs with tight spacing.
 * `expected` is the line after applying `formatTextLine` changes.
 */
export const formatLineFixtures: readonly FormatLineFixture[] = [
	{
		name: 'binding with arithmetic',
		doc: 'some=1+1',
		expected: 'some = 1 + 1',
	},
	{
		name: 'just one space to insert left',
		doc: 'some = 1 +1',
		expected: 'some = 1 + 1',
	},
	{
		name: 'with parenthesis',
		doc: '((23 -1) * 12)/2',
		expected: '((23 - 1) * 12) / 2',
	},
	{
		name: 'number and unit',
		doc: '100USD',
		expected: '100 USD',
	},
	{
		name: 'binding with value and unit',
		doc: 'w=12EUR',
		expected: 'w = 12 EUR',
	},
	{
		name: 'binary addition',
		doc: '2+2',
		expected: '2 + 2',
	},
	{
		name: 'mixed operators',
		doc: '2+2*3',
		expected: '2 + 2 * 3',
	},
	{
		name: 'multi line doc',
		doc: 'some=1+1\n232EUR/2 in USD',
		expected: 'some = 1 + 1\n232 EUR / 2 in USD',
	},
	{
		name: 'does nothing with already spaced doc',
		doc: 'some  = ((1 +  1 ) / 2) *  2',
		expected: 'some  = ((1 +  1 ) / 2) *  2',
	},
];
