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
	if (parent?.type.id === terms.Binding) {
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

