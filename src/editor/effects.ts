import { StateEffect } from '@codemirror/state'


/**
 * When currency rate is updated in the store, we need notify the editor
 * so it re-compute values using calculator.
*/
export const CurrencyRateUpdated = StateEffect.define();

/**
 * Show/hide editor toolbar.
*/
export const ToggleToolbar = StateEffect.define<boolean>();