/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Parsed from `src/units/currencies-list.csv` via Vite `define` in `vite.config.ts`. */
declare const __CURRENCIES__: readonly import('./units/parse-currencies-csv').CurrencyEntry[];
