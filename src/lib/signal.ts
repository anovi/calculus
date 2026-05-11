import {
	type ReactiveSource,
	type ReactiveSubscriber,
	ReactiveContext,
	notifySubscribers,
} from "./reactive-context";

function clearSubscriberSources(
	sources: Set<ReactiveSource>,
	subscriber: ReactiveSubscriber,
): void {
	for (const src of sources) {
		src.unlink(subscriber);
	}
	sources.clear();
}

export class Signal<T> implements ReactiveSource {
	private _value: T;
	private readonly subs = new Set<ReactiveSubscriber>();

	constructor(initial: T) {
		this._value = initial;
	}

	peek(): T {
		return this._value;
	}

	read(): T {
		ReactiveContext.current()?.track(this);
		return this._value;
	}

	set(next: T): void {
		if (Object.is(this._value, next)) return;
		this._value = next;
		notifySubscribers(this.subs);
	}

	update(updater: (prev: T) => T): void {
		this.set(updater(this._value));
	}

	link(subscriber: ReactiveSubscriber): void {
		this.subs.add(subscriber);
	}

	unlink(subscriber: ReactiveSubscriber): void {
		this.subs.delete(subscriber);
	}
}

export class Computed<T> implements ReactiveSource, ReactiveSubscriber {
	private _value: T | undefined;
	private dirty = true;
	private readonly subs = new Set<ReactiveSubscriber>();
	private readonly sources = new Set<ReactiveSource>();
	private readonly compute: () => T;

	constructor(compute: () => T) {
		this.compute = compute;
	}

	peek(): T | undefined {
		return this._value;
	}

	read(): T {
		ReactiveContext.current()?.track(this);
		if (this.dirty) this.recompute();
		return this._value as T;
	}

	notify(): void {
		if (!this.dirty) {
			this.dirty = true;
			notifySubscribers(this.subs);
		}
	}

	track(source: ReactiveSource): void {
		if (!this.sources.has(source)) {
			this.sources.add(source);
			source.link(this);
		}
	}

	link(subscriber: ReactiveSubscriber): void {
		this.subs.add(subscriber);
	}

	unlink(subscriber: ReactiveSubscriber): void {
		this.subs.delete(subscriber);
	}

	private recompute(): void {
		clearSubscriberSources(this.sources, this);
		this._value = ReactiveContext.run(this, this.compute);
		this.dirty = false;
	}
}

export class Effect implements ReactiveSubscriber {
	private readonly sources = new Set<ReactiveSource>();
	private disposed = false;
	private readonly fn: () => void;

	constructor(fn: () => void) {
		this.fn = fn;
		this.run();
	}

	notify(): void {
		if (this.disposed) return;
		this.run();
	}

	track(source: ReactiveSource): void {
		if (!this.sources.has(source)) {
			this.sources.add(source);
			source.link(this);
		}
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		clearSubscriberSources(this.sources, this);
	}

	private run(): void {
		clearSubscriberSources(this.sources, this);
		ReactiveContext.run(this, this.fn);
	}
}

export function createSignal<T>(initial: T): [() => T, Signal<T>["set"]] {
	const s = new Signal(initial);
	return [() => s.read(), s.set.bind(s)];
}

export function createComputed<T>(compute: () => T): () => T {
	const c = new Computed(compute);
	return () => c.read();
}

export function createEffect(fn: () => void): () => void {
	const e = new Effect(fn);
	return () => e.dispose();
}

export function batch(fn: () => void): void {
	ReactiveContext.batch(fn);
}

export function untrack<T>(fn: () => T): T {
	return ReactiveContext.untrack(fn);
}

export function getReadonlySignal<T>(signal: Signal<T>): () => T {
	return () => signal.read();
}
