import type Decimal from 'decimal.js';

import { getMeasureKind, MeasureKind } from './internals/convert-package';
import { normalizeUnit } from './unit-name-normalizer';

/**
 * Target significant figures when applying magnitude-aware formatting.
 * Larger |value| → fewer fractional digits, down to the per-kind {@link MAX_DECIMAL_PLACES_BY_MEASURE_KIND} cap.
 */
export const DISPLAY_SIGNIFICANT_FIGURES = 6;

/**
 * Maximum fractional digits when displaying calculation results, keyed by
 * {@link MeasureKind} from the `convert` package.
 */
export const MAX_DECIMAL_PLACES_BY_MEASURE_KIND: Readonly<Record<MeasureKind, number>> = {
	/** Degrees, radians — navigation often uses 1–2 dp; trig benefits from a few more. */
	[MeasureKind.Angle]: 4,
	/** Square metres, acres, etc. — everyday areas rarely need sub‑cm² precision. */
	[MeasureKind.Area]: 3,
	/** Bytes, bits — fractional KiB/MiB is common; sub‑bit precision is not useful. */
	[MeasureKind.Data]: 2,
	/** Joules, kWh, calories — lab values can be small; cap noise from conversion. */
	[MeasureKind.Energy]: 4,
	/** Newtons, pound‑force — same order as mass × acceleration display habits. */
	[MeasureKind.Force]: 4,
	/** Hertz, rpm — audio/RF contexts sometimes use several digits. */
	[MeasureKind.Frequency]: 4,
	/** Lux — whole or 1–2 dp matches lighting specs. */
	[MeasureKind.Illuminance]: 2,
	/** Metres, feet, miles — mm‑level (3–4 dp in metres) is enough for most use. */
	[MeasureKind.Length]: 4,
	/** Candelas per square metre — specialist; moderate precision. */
	[MeasureKind.Luminance]: 4,
	/** Candela — specialist; moderate precision. */
	[MeasureKind.LuminousIntensity]: 4,
	/** Kilograms, pounds — kitchen scales use 1 dp; 4 dp covers lab without noise. */
	[MeasureKind.Mass]: 4,
	/** Watts, horsepower — utility bills and specs rarely exceed 2–3 dp. */
	[MeasureKind.Power]: 4,
	/** Pascals, bar, psi — gauges and weather often quote 1–2 dp. */
	[MeasureKind.Pressure]: 4,
	/** Celsius, Fahrenheit — 0.1° is meaningful; more is usually conversion artefact. */
	[MeasureKind.Temperature]: 2,
	/** Seconds, hours — sub‑second timing may need ms (3 dp in seconds). */
	[MeasureKind.Time]: 3,
	/** Litres, gallons — recipes and fuel; 2–3 dp is typical. */
	[MeasureKind.Volume]: 3,
};

const MEASURE_KINDS: readonly MeasureKind[] = [
	MeasureKind.Angle,
	MeasureKind.Area,
	MeasureKind.Data,
	MeasureKind.Energy,
	MeasureKind.Force,
	MeasureKind.Frequency,
	MeasureKind.Illuminance,
	MeasureKind.Length,
	MeasureKind.Luminance,
	MeasureKind.LuminousIntensity,
	MeasureKind.Mass,
	MeasureKind.Power,
	MeasureKind.Pressure,
	MeasureKind.Temperature,
	MeasureKind.Time,
	MeasureKind.Volume,
];

/** Per-kind fractional-digit cap for a physical unit, without magnitude adjustment. */
export function getMeasureDecimalPlaces(unit: string): number | undefined {
	const kind = measureKindForUnit(unit);
	if (kind == null) return undefined;
	return MAX_DECIMAL_PLACES_BY_MEASURE_KIND[kind];
}

/**
 * Fractional digits for a measured value: magnitude-aware precision capped by kind.
 *
 * `dp = min(maxDp, max(0, DISPLAY_SIGNIFICANT_FIGURES − 1 − ⌊log₁₀|value|⌋))`
 */
export function magnitudeAwareDecimalPlaces(value: Decimal, maxDp: number): number {
	const abs = value.abs();
	if (abs.isZero()) return 0;
	const magnitude = decimalLog10Floor(abs);
	const dp = DISPLAY_SIGNIFICANT_FIGURES - 1 - magnitude;
	return Math.max(0, Math.min(maxDp, dp));
}

/** Display precision for a physical unit and numeric result, or `undefined` if unknown. */
export function getMeasureDisplayDecimalPlaces(value: Decimal, unit: string): number | undefined {
	const maxDp = getMeasureDecimalPlaces(unit);
	if (maxDp == null) return undefined;
	return magnitudeAwareDecimalPlaces(value, maxDp);
}

function decimalLog10Floor(abs: Decimal): number {
	const sci = abs.toExponential();
	const match = /e([+-]?\d+)$/i.exec(sci);
	if (match) return Number.parseInt(match[1], 10);
	return Math.floor(Math.log10(abs.toNumber()));
}

function measureKindForUnit(unit: string): MeasureKind | undefined {
	const direct = getMeasureKind(unit);
	if (direct != null) return direct;
	const canonical = normalizeUnit(unit);
	if (canonical == null || Array.isArray(canonical)) return undefined;
	return getMeasureKind(canonical);
}

/** @internal Exported for tests — every `convert` {@link MeasureKind} must have a display cap. */
export const ALL_MEASURE_KINDS: readonly MeasureKind[] = MEASURE_KINDS;
