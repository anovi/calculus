/**
 * Execution stack for reactive dependency tracking.
 * While a subscriber (effect or computed) runs, signal reads link to that subscriber.
 */

export interface ReactiveSource {
	link(subscriber: ReactiveSubscriber): void;
	unlink(subscriber: ReactiveSubscriber): void;
}

export interface ReactiveSubscriber {
	notify(): void;
	/** Called when this subscriber reads a source during its active run. */
	track(source: ReactiveSource): void;
}

const stack: ReactiveSubscriber[] = [];

let batchDepth = 0;
const pending = new Set<ReactiveSubscriber>();

function flushPending(): void {
	while (pending.size > 0) {
		const wave = [...pending];
		pending.clear();
		for (const sub of wave) {
			sub.notify();
		}
	}
}

export function notifySubscribers(subs: Iterable<ReactiveSubscriber>): void {
	if (batchDepth > 0) {
		for (const sub of subs) pending.add(sub);
		return;
	}
	// Copy before notifying: subscribers may unlink themselves during `notify`.
	for (const sub of [...subs]) sub.notify();
}

/**
 * Public entry points for the reactive execution stack and batching.
 */
export const ReactiveContext = {
	current(): ReactiveSubscriber | undefined {
		const i = stack.length;
		return i === 0 ? undefined : stack[i - 1];
	},

	run<T>(subscriber: ReactiveSubscriber | undefined, fn: () => T): T {
		if (subscriber === undefined) return fn();
		stack.push(subscriber);
		try {
			return fn();
		} finally {
			stack.pop();
		}
	},

	untrack<T>(fn: () => T): T {
		const snapshot = stack.slice();
		stack.length = 0;
		try {
			return fn();
		} finally {
			stack.push(...snapshot);
		}
	},

	batch(fn: () => void): void {
		batchDepth++;
		try {
			fn();
		} finally {
			batchDepth--;
			if (batchDepth === 0) flushPending();
		}
	},
};
