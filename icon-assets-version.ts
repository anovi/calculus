/** Bump when public/ icon files change so browsers and the PWA pick up new assets. */
export const ICON_ASSETS_VERSION = '3'

export function versionedIconAsset(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return `${name}.v${ICON_ASSETS_VERSION}`
  return `${name.slice(0, dot)}.v${ICON_ASSETS_VERSION}${name.slice(dot)}`
}
