import { type Format } from "./editor-commands";


export type Operation = 'plus'|'multiplication'|'division'|'euqal'|'minus'|'parentheses'

export type OperationDef = {
    sign: string,
    operation: Operation,
    insert?: Format,
}

const singleOperatorSelection: Format['selection'] = function(_text, from, to) {
    if (from === to) return { from: from + 1, to: to + 1 };
    return { from: from + 1, to: to + 1 };
}

export const OperationsDictionary: Record<Operation, OperationDef> = {
    plus: {
        sign: '+',
        insert: { open: '+', block: false, selection: singleOperatorSelection },
        operation: 'plus',
    },
    minus: {
        sign: '\u2212',
        insert: { open: '-', block: false, selection: singleOperatorSelection },
        operation: 'minus',
    },
    multiplication: {
        sign: '\u00D7',
        insert:  { open: '*', block: false, selection: singleOperatorSelection },
        operation: 'multiplication',
    },
    division: {
        sign: '\u00F7',
        insert:  { open: '/', block: false, selection: singleOperatorSelection },
        operation: 'division',
    },
    euqal: {
        sign: '=',
        insert: { open: '=', block: false, selection: singleOperatorSelection },
        operation: 'euqal',
    },
    parentheses: {
        sign: '( )',
        insert: {
            open: '(', close: ')',
            selection(text, from, to) {
                console.log(text, from, to)
                if (from === to) return {from: from + 1, to: to + 1}
                return { from: from + 1, to: to}
            },
            block: false
        },
        operation: 'parentheses',
    },
}
