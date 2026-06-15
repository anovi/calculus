import freelanceInvoice from './bodies/freelance-invoice.txt?raw';
import monthlyBudget from './bodies/monthly-budget.txt?raw';
import recipeScaling from './bodies/recipe-scaling.txt?raw';
import savingsGrowth from './bodies/savings-growth.txt?raw';
import tipSplitBill from './bodies/tip-split-bill.txt?raw';
import tripPlanning from './bodies/trip-planning.txt?raw';
import unitConversion from './bodies/unit-conversion.txt?raw';
import vatTax from './bodies/vat-tax.txt?raw';

export type Template = {
  name: string;
  description: string;
  content: string;
};

export const TEMPLATES: Template[] = [
  {
    name: '🍕 Split the check',
    description: 'Split a restaurant bill with tip',
    content: tipSplitBill,
  },
  {
    name: '📊 Monthly budget',
    description: 'Track income, fixed costs, and savings',
    content: monthlyBudget,
  },
  {
    name: '✈️ Trip planning',
    description: 'Estimate travel costs in mixed currencies',
    content: tripPlanning,
  },
  {
    name: '🍳 Recipe scaling',
    description: 'Scale ingredient amounts for a different serving count',
    content: recipeScaling,
  },
  {
    name: '📏 Unit conversion',
    description: 'Convert between common units',
    content: unitConversion,
  },
  {
    name: '🧾 VAT / tax',
    description: 'Calculate gross from net and a tax rate',
    content: vatTax,
  },
  {
    name: '📈 Compound savings growth',
    description: 'Project savings with recurring contributions and compound interest',
    content: savingsGrowth,
  },
  {
    name: '💼 Freelance invoice',
    description: 'Bill hours, apply discount, convert to home currency',
    content: freelanceInvoice,
  },
];
