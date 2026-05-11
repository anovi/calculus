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

export class MathComposer {

    bindings: Map<string, unknown> = new Map();
    
	sliceDoc: (from: number, to: number) => string;

	constructor(sliceDoc: (from: number, to: number) => string) {
		this.sliceDoc = sliceDoc;
	}

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

	private processRows(cursor: TreeCursor): Range<CalcValue>[] {
		const pipeline: Range<CalcValue>[] = [];
		if (cursor.firstChild()) {
			do {
				if (cursor.node.type.id in this) {
                    // @ts-ignore
                    const value = this[cursor.node.type.id](cursor);
                    if (value) pipeline.push(value);
                }
			} while (cursor.nextSibling());
			cursor.parent();
		}
		return pipeline;
	}

    [terms.Binding](cursor: TreeCursor): Range<CalcValue>|null {
        let value: Range<CalcValue>|null = null;

        if (cursor.firstChild()) {
            let id: string|undefined = undefined;
            let result: null|number = null;
			do {
				switch (cursor.type.id) {
                    case terms.Identifier:
                        id = this.sliceDoc(cursor.from, cursor.to);    
                        break;
                    case terms.AddExpression:
                        result = this[terms.AddExpression](cursor);
                        break;
                    default:
                        break;
                }
			} while (cursor.nextSibling());
            
            if (result !== null) {
                value = new CalcValue(result, id).range(cursor.from, cursor.to);
                if (id !== undefined) this.bindings.set(id, result);
            }
            cursor.parent();
		}
        return value;
    }

    [terms.NoBinding](cursor: TreeCursor): Range<CalcValue>|null {
        let value: Range<CalcValue>|null = null;

        if (cursor.firstChild()) {
            let result: null|number = null;
			do {
				switch (cursor.type.id) {
                    case terms.AddExpression:
                        result = this[terms.AddExpression](cursor);
                        break;
                    default:
                        break;
                }
			} while (cursor.nextSibling());
            
            if (result !== null) value = new CalcValue(result).range(cursor.from, cursor.to);
            cursor.parent();
		}

        return value;
    }

    [terms.AddExpression](cursor: TreeCursor): number|null {
        let result: null|number = null;
        const pipeline: number[] = [];

        if (cursor.firstChild()) {
			do {
				switch (cursor.type.id) {
                case terms.AddExpression:
                    result = this[terms.AddExpression](cursor);
                    if (result !== null) pipeline.push(result);
                    break;
                case terms.MulExpression:
                    result = this[terms.MulExpression](cursor);
                    if (result !== null) pipeline.push(result);
                    break;
                case terms.Literal:
                    const n = this[terms.Literal](cursor);
                    if (isNumber(n)) {
                        pipeline.push(n);
                    }
                    break;
                default:
                    break;
                }
			} while (cursor.nextSibling());
            cursor.parent();
		}

        if (pipeline.length > 0) return add(...pipeline);
        return null;
    }

    [terms.MulExpression](cursor: TreeCursor): number|null {
        let result: null|number = null;
        const pipeline: number[] = [];

        if (cursor.firstChild()) {
			do {
				switch (cursor.type.id) {
                case terms.AddExpression:
                    result = this[terms.AddExpression](cursor);
                    if (result !== null) pipeline.push(result);
                    break;
                case terms.MulExpression:
                    result = this[terms.MulExpression](cursor);
                    if (result !== null) pipeline.push(result);
                    break;
                case terms.Literal:
                    const n = this[terms.Literal](cursor);
                    if (isNumber(n)) {
                        pipeline.push(n);
                    }
                    break;
                default:
                    break;
                }
			} while (cursor.nextSibling());
            cursor.parent();
		}

        if (pipeline.length > 0) return times('*', ...pipeline);
        return null;
    }

    [terms.ConvertExpression](_cursor: TreeCursor) {}

    [terms.Literal](cursor: TreeCursor): number|null {
        let result: number|null = null;
        if (cursor.firstChild()) {
			do {
				switch (cursor.type.id) {
                case terms.Number:
                    result = this[terms.Number](cursor);
                    break;
                default:
                    break;
                }
			} while (cursor.nextSibling());
            cursor.parent();
		}
        return result;
    }

    [terms.String](_cursor: TreeCursor) {}

    [terms.Number](cursor: TreeCursor) {
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

function add(...args: number[]) {
    let sum = 0;
    for (let index = 0; index < args.length; index++) {
        sum += args[index]; 
    }
    return sum;
}
function times(operator: '/'|'*'|'%', ...args: number[] ) {
    let result = args[0];
    for (let index = 1; index < args.length; index++) {
        switch (operator) {
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
