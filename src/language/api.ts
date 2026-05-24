import type { SyntaxNode } from '@lezer/common';

import * as terms from "./baseline/calculus-language.terms"


/**
* Check if not is not a composite node.
*/
export function isAtomicNode(id: number): boolean {
    switch (id) {
    case terms.Identifier:
    case terms.Number:
    case terms.Unit:
    case terms.EqualSign:
    case terms.PlusBinaryOp:
    case terms.TimesBinaryOp:
    case terms.PowBinaryOp:
    case terms.ConvertOp:
        return true
    default:
        return false
    }
}

export function isLiteral(node: SyntaxNode): boolean {
    const id = node.type.id;
    switch (id) {
    case terms.Literal:
    case terms.Number:
    case terms.String:
    case terms.Date:
        return true;
    default:
        if (id === terms.Unit && node.parent && node.parent.type.id === terms.NumberWithUnit) return true;
        return false;
    }
}

export function getLiteralTopNode(node: SyntaxNode): SyntaxNode|null {
    const id = node.type.id;
    switch (id) {
    case terms.Literal:
        return node;
    case terms.Number:
        if (node.parent && node.parent.type.id === terms.NumberWithUnit) {
            if (node.parent.parent) return getLiteralTopNode(node.parent.parent);
        }
        if (node.parent) return getLiteralTopNode(node.parent);
        break;
    case terms.String:
    case terms.Date:
        if (node.parent) return getLiteralTopNode(node.parent);
        break;
    case terms.Unit:
        if (node.parent && node.parent.type.id === terms.NumberWithUnit) {
            if (node.parent.parent) return getLiteralTopNode(node.parent.parent);
        }
    }

    return null;
}