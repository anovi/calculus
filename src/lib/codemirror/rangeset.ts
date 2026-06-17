import { ChangeDesc, RangeSet, RangeValue } from "@codemirror/state";


/**
 * Callback bundle used by `compare_rangesets` to report diffs between two
 * `RangeSet`s. Implementations decide how to handle added/removed/changed
 * ranges and may optionally handle unchanged ranges via `same`.
 */
export interface RangeSetValuesComparator {
	added: (value: RangeValue, from: number, to: number) => void;
	removed: (value: RangeValue, from: number, to: number) => void;
	changed: (valueA: RangeValue, valueB: RangeValue, from: number, to: number) => void;
	same?: (valueA: RangeValue, valueB: RangeValue, from: number, to: number) => void;
}

/**
 * Compares two `RangeSet`s and invokes callbacks for added, removed, changed,
 * or same ranges after applying a `ChangeDesc` mapping to the first set.
 *
 * It does not rely on object identity and uses `eq` method of `RangeValue`,
 * so this method must be implemented.
 *
 * Rangesets must be of the same document: before and after change.
 *
 * This is used by link tracking tests to detect how editor changes affect
 * link ranges without relying on object identity.
 */
export function compareRangesets(
	/** Unmapped rangeset of previous state  */
	rangesetA: RangeSet<RangeValue>,
	/** New rangeset from current state  */
	rangesetB: RangeSet<RangeValue>,
	changes: ChangeDesc,
	comparator: RangeSetValuesComparator,
) {
	const curA = rangesetA.iter();
	const curB = rangesetB.iter();

	while (curA.value || curB.value) {
		const curA_mappedFrom = curA.value ? changes.mapPos(curA.from, 1) : curA.from;
		const curA_mappedTo = curA.value ? changes.mapPos(curA.to) : curA.to;

		// 12-23 12-23
		// 35-40 …     [removed range]
		// 55-67 55-67

		// 12-23 …
		// 35-40 …
		// 55-67 55-67

		if (curA.value && !curB.value) {
			comparator.removed(curA.value, curA.from, curA.to);
			curA.next();
			continue;
		} else if (curB.value && !curA.value) {
			comparator.added(curB.value, curB.from, curB.to);
			curB.next();
			continue;
		}

		const valueA = curA.value;
		const valueB = curB.value;
		if (!valueA || !valueB) {
			// Narrow types for TS; loop guards already handled presence.
			throw Error('[compare_rangesets] this should not happen!')
		}

		if (curA_mappedFrom < curB.from) {
			// range from A removed?
			comparator.removed(valueA, curA.from, curA.to);
			curA.next();
			continue;
		}

		if (curA_mappedFrom > curB.from) {
			// range from B added?
			comparator.added(valueB, curB.from, curB.to);
			curB.next();
			continue;
		}

		if (valueA.eq(valueB)) {
			// same value
			comparator.same?.(valueA, valueB, curB.from, curB.to);
			curA.next();
			curB.next();
			continue;
		}

		if (curA_mappedFrom === curB.from && curA_mappedTo === curB.to) {
			// range changed?
			comparator.changed(valueA, valueB, curA.from, curA.to);
			curA.next();
			curB.next();
			continue
		}

		throw Error('[compare_rangesets] this should not happen!')
	}
}


/**
 * Searches for a range in a RangeSet using a custom comparator function.
 * Works similar to Array.find() but for RangeSet.
 *
 * @param rangeSet - The RangeSet to search in
 * @param predicate - A function that tests each range. Receives (value, from, to) and returns true if the range matches
 * @returns The first matching range as { value, from, to }, or undefined if no match is found
 *
 * @example
 * ```typescript
 * const range = findRange(rangeSet, (value, from, to) => {
 *   return value instanceof InternalLink && from === 10;
 * });
 * if (range) {
 *   console.log(range.value, range.from, range.to);
 * }
 * ```
 */
export function findRange<T extends RangeValue>(
	rangeSet: RangeSet<T>,
	predicate: (value: T, from: number, to: number) => boolean
): { value: T; from: number; to: number } | undefined {
	const cursor = rangeSet.iter();
	while (cursor.value) {
		if (predicate(cursor.value, cursor.from, cursor.to)) {
			return {
				value: cursor.value,
				from: cursor.from,
				to: cursor.to,
			};
		}
		cursor.next();
	}
	return undefined;
}
