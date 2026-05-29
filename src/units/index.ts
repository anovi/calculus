// Rules:
// - do not export internals
// - do not export implementation details, only domain semantics

export * from './types';
export {
    canConvert,
    convertValue,
    areUnitsCompatible,
    getMeasurementUnits,
} from './unit-converter';
export {
    longestRecognizedUnitSpelling,
} from './all-units-vocabluary';
export {
    getCurrencyDecimalPlaces,
    isCurrency,
    isCurrencyCode,
    getCurrencies,
    type CurrencyCode,
    type CurrencyEntry,
} from './currency';
export {
    normalizeUnit
} from './unit-name-normalizer';
export {
    formatUnitChoiceLabel,
} from './unit-display';
export {
    getMeasureDecimalPlaces,
    getMeasureDisplayDecimalPlaces,
    magnitudeAwareDecimalPlaces,
} from './measure-display-precision';