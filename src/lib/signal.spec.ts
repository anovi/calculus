import assert from "node:assert";
import { batch, createComputed, createEffect, createSignal, Signal, untrack } from "./signal";

describe("signal", () => {
	it("propagates signal updates to an effect", () => {
		const [get, set] = createSignal(1);
		const out: number[] = [];
		createEffect(() => {
			out.push(get());
		});
		assert.deepStrictEqual(out, [1]);
		set(2);
		assert.deepStrictEqual(out, [1, 2]);
	});

	it("runs computed lazily and caches until deps change", () => {
		const [getA, setA] = createSignal(1);
		const [getB] = createSignal(2);
		let runs = 0;
		const sum = createComputed(() => {
			runs++;
			return getA() + getB();
		});
		assert.strictEqual(runs, 0);
		assert.strictEqual(sum(), 3);
		assert.strictEqual(runs, 1);
		assert.strictEqual(sum(), 3);
		assert.strictEqual(runs, 1);
		setA(10);
		assert.strictEqual(sum(), 12);
		assert.strictEqual(runs, 2);
	});

	it("untrack reads do not subscribe", () => {
		const [get, set] = createSignal(0);
		let runs = 0;
		createEffect(() => {
			runs++;
			untrack(() => get());
		});
		assert.strictEqual(runs, 1);
		set(1);
		assert.strictEqual(runs, 1);
	});

	it("batches notifications until batch ends", () => {
		const [getA, setA] = createSignal(0);
		const [getB, setB] = createSignal(0);
		const runs: string[] = [];
		createEffect(() => {
			runs.push(`${getA()}-${getB()}`);
		});
		runs.length = 0;
		batch(() => {
			setA(1);
			setB(2);
		});
		assert.deepStrictEqual(runs, ["1-2"]);
	});

	it("dispose stops the effect", () => {
		const [get, set] = createSignal(0);
		const values: number[] = [];
		const stop = createEffect(() => {
			values.push(get());
		});
		set(1);
		stop();
		set(2);
		assert.deepStrictEqual(values, [0, 1]);
	});

	it("Signal.peek does not track", () => {
		const s = new Signal(0);
		let runs = 0;
		createEffect(() => {
			runs++;
			s.peek();
		});
		assert.strictEqual(runs, 1);
		s.set(1);
		assert.strictEqual(runs, 1);
	});
});
