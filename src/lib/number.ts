
export function isFloatNumber(n: number) {
	return isNumber(n) && !Number.isInteger(n);
}	

export function isNumber(n: unknown): n is number {
	return typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);
}
