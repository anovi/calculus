/** Common mobile phone / tablet user-agent substrings. */
const MOBILE_UA_RE =
	/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Mobi|Windows Phone/i

/** Classic iOS device identifiers in user agent. */
const IOS_UA_RE = /iPad|iPhone|iPod/i

function hasNavigator(): boolean {
	return typeof navigator !== "undefined"
}

/** True when the runtime looks like a phone or tablet (not desktop). */
export function isMobileDevice(): boolean {
	if (!hasNavigator()) return false
	return MOBILE_UA_RE.test(navigator.userAgent)
}

/** True in mobile Safari and other mobile browsers on iOS (iPhone, iPod, iPad). */
export function isIOSDevice(): boolean {
	if (!hasNavigator()) return false
	return IOS_UA_RE.test(navigator.userAgent)
}
