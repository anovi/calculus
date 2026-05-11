import { TreeCursor } from '@lezer/common';
import { RangeValue, Range } from "@codemirror/state";

import { terms } from '../language';
import { isNumber } from '../lib/number';


/** Represents a row of calculation; can be binded to a name or not */
export class CalcValue extends RangeValue {
    readonly result: number;
    readonly dependencies?: string[];
    readonly name?: string;
    constructor(result: number, name?: string, dependencies?: string[]) {
        super();
        this.result = result;
        this.name = name;
        this.dependencies = dependencies;
    }
}

type Operator = '-' | '+' | '/' | '*' | '%';

export class MathComposer {
	constructor(sliceDoc: (from: number, to: number) => string) {
		this.sliceDoc = sliceDoc;
	}
    
    bindings: Map<string, unknown> = new Map();

    sliceDoc: (from: number, to: number) => string;

    assemble(cursor: TreeCursor, throwErrors: boolean = false): Range<CalcValue>[]|null {
		try {
            if (cursor.type.id === terms.CalcDoc) {
                return this.processRows(cursor);
            }
            throw Error(`Cursor is not on CalcDoc root node!`);	
		} catch (error) {
			if (throwErrors) {
				console.error(error);
				throw error;
			}
			else if (error instanceof Error) {
				console.error(error);
			}
		}
		return null;
	}

    private readonly nodeHandlers: Map<number, (cursor: TreeCursor) => unknown> = new Map<number, (cursor: TreeCursor) => unknown>([
        [terms.Binding, (cursor) => this.processBinding(cursor)],
        [terms.NoBinding, (cursor) => this.processBinding(cursor)],
        [terms.AddExpression, (cursor) => this.processAddExpression(cursor)],
        [terms.MulExpression, (cursor) => this.processMulExpression(cursor)],
        [terms.ConvertExpression, (cursor) => this.processConvertExpression(cursor)],
        [terms.Literal, (cursor) => this.processLiteral(cursor)],
        [terms.String, (cursor) => this.processString(cursor)],
        [terms.Number, (cursor) => this.processNumber(cursor)],
    ]);

	private processRows(cursor: TreeCursor): Range<CalcValue>[] {
		const pipeline: Range<CalcValue>[] = [];
		if (cursor.firstChild()) {
			do {
                const value = this.callHandler<Range<CalcValue> | null>(cursor.type.id, cursor);
                if (value) pipeline.push(value);
			} while (cursor.nextSibling());
			cursor.parent();
		}
		return pipeline;
	}

    private callHandler<T>(termId: number, cursor: TreeCursor): T | null {
        const handler = this.nodeHandlers.get(termId);
        if (!handler) return null;
        return handler(cursor) as T;
    }

    private forEachChild(
        cursor: TreeCursor,
        handlers: ReadonlyMap<number, (cursor: TreeCursor) => void>
    ): void {
        if (!cursor.firstChild()) return;
        do {
            handlers.get(cursor.type.id)?.(cursor);
        } while (cursor.nextSibling());
        cursor.parent();
    }

    private processBinding(cursor: TreeCursor): Range<CalcValue>|null {
        let value: Range<CalcValue>|null = null;
        let id: string|undefined = undefined;
        let result: null|number = null;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Identifier, (childCursor) => {
                id = this.sliceDoc(childCursor.from, childCursor.to);
            }],
            [terms.Literal, (childCursor) => {
                result = this.callHandler<number>(terms.Literal, childCursor);
            }],
            [terms.MulExpression, (childCursor) => {
                result = this.callHandler<number>(terms.MulExpression, childCursor);
            }],
            [terms.AddExpression, (childCursor) => {
                result = this.callHandler<number>(terms.AddExpression, childCursor);
            }],
        ]));

        if (result !== null) {
            value = new CalcValue(result, id).range(cursor.from, cursor.to);
            if (id !== undefined) this.bindings.set(id, result);
        }
        return value;
    }
    // reducer: (...values: number[]) => number
    private processExpression(cursor: TreeCursor, type: 'plus'|'times'): number | null {
        const pipeline: number[] = [];
        let operator: Operator = '+';

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.AddExpression, (nestedCursor) => {
                const value = this.callHandler<number>(terms.AddExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.MulExpression, (nestedCursor) => {
                const value = this.callHandler<number>(terms.MulExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.Identifier, (nestedCursor) => {
                const id = this.sliceDoc(nestedCursor.from, nestedCursor.to);
                const value = this.bindings.get(id)
                if (isNumber(value)) pipeline.push(value);
            }],
            [terms.Literal, (nestedCursor) => {
                const value = this.callHandler<number>(terms.Literal, nestedCursor);
                if (isNumber(value)) pipeline.push(value);
            }],
            [terms.PlusBinaryOp, (cursor) => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
            [terms.TimesBinaryOp, () => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
        ]));

        if (pipeline.length > 0) {
            return performOperation(operator, ...pipeline)
        }
        return null;
    }

    private processAddExpression(cursor: TreeCursor): number|null {
        return this.processExpression(cursor, 'plus');
    }

    private processMulExpression(cursor: TreeCursor): number|null {
        return this.processExpression(cursor, 'times');
    }

    private processConvertExpression(_cursor: TreeCursor): null {
        return null;
    }

    private processLiteral(cursor: TreeCursor): number|null {
        let result: number|null = null;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Number, (numberCursor) => {
                result = this.callHandler<number>(terms.Number, numberCursor);
            }],
        ]));

        return result;
    }

    private processString(_cursor: TreeCursor): null {
        return null;
    }

    private processNumber(cursor: TreeCursor): number | null {
        const raw = this.sliceDoc(cursor.from, cursor.to);
        try {
            return Number.parseFloat(raw);
        } catch {}
        try {
            return Number.parseInt(raw);
        } catch {}
        return null;
    }
}

function performOperation(operator: Operator, ...args: number[] ) {
    let result = args[0];
    for (let index = 1; index < args.length; index++) {
        switch (operator) {
            case '-':
                result = result - args[index]; 
                break;
            case '+':
                result = result + args[index]; 
                break;
            case '%':
                result = result % args[index]; 
                break;
            case '*':
                result = result * args[index]; 
                break;
            case '/':
                result = result / args[index]; 
                break;
            default:
                throw Error(`Unknown operator ${operator}`)
        }
    }
    return result;
}
