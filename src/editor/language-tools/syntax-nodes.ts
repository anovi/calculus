import type { SyntaxNode } from '@lezer/common';

import { terms, type TermValue } from '../../language';


const identifierUseParents = new Set<TermValue>([
	terms.ExpExpression,
	terms.AddExpression,
	terms.MulExpression,
	terms.ConvertExpression,
	terms.ArgList,
])

/** Identifier that refers to a variable value (not a binding name or function name). */
export function isVariableReference(node: SyntaxNode): boolean {
	if (node.type.id !== terms.Identifier) return false
	const parent = node.parent
	if (parent != null && parent.type.id === terms.Binding) {
		const nameId = parent.firstChild
		return nameId != null && node.from !== nameId.from
	}
	return isVariableIdentifierUse(node)
}

export function isVariableIdentifierUse(node: SyntaxNode): boolean {
	if (node.type.id !== terms.Identifier) return false
	const parent = node.parent
	if (parent == null) return false
	return identifierUseParents.has(parent.type.id as TermValue)
}

export function isBindingIdentifier(node: SyntaxNode): boolean {
	return node.type.id === terms.Identifier && node.parent?.type.id === terms.Binding
}

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

/**
* Is [node] a literal or its part.
*/
export function isLiteral(node: SyntaxNode): boolean {
	const id = node.type.id;
	switch (id) {
		case terms.Literal:
		case terms.Number:
		case terms.PercentLiteral:
		case terms.String:
		case terms.Date:
			return true;
		default:
			if (id === terms.Unit && node.parent && node.parent.type.id === terms.NumberWithUnit) return true;
			if (id === terms.PercentSuffix && node.parent && node.parent.type.id === terms.PercentLiteral) return true;
			return false;
	}
}

/**
* Returns Literal node for a given node:
* - if the node itself is Literal
* - or it's a part of a Literal
*/
export function getLiteralTopNode(node: SyntaxNode): SyntaxNode|null {
	const id = node.type.id;

	switch (id) {
	case terms.Literal:
		return node;
		
	case terms.Number:
		if (
			node.parent &&
			node.parent.type.id === terms.NumberWithUnit &&
			node.parent.parent
		) return getLiteralTopNode(node.parent.parent);
		if (
			node.parent &&
			node.parent.type.id === terms.PercentLiteral &&
			node.parent.parent
		) return getLiteralTopNode(node.parent.parent);
		if (node.parent) return getLiteralTopNode(node.parent);
		break;
		
	case terms.PercentSuffix:
		if (
			node.parent &&
			node.parent.type.id === terms.PercentLiteral &&
			node.parent.parent
		) return getLiteralTopNode(node.parent.parent);
		break;

	case terms.String:
	case terms.Date:
		if (node.parent) return getLiteralTopNode(node.parent);
		break;
		
	case terms.Unit:
		if (
			node.parent &&
			node.parent.type.id === terms.NumberWithUnit &&
			node.parent.parent
		) return getLiteralTopNode(node.parent.parent);
	}
	
	return null;
}