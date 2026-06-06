import { createEditor, createDocumentControlsPanel, createPersistDocumentExtension } from '../editor'
import { DocumentDrawer } from '../drawer'
import { createAppContext } from './app-context'

export async function mountApp(root: HTMLElement): Promise<void> {
  const { ctx, initialDocument } = await createAppContext()

  const controlsPanel = createDocumentControlsPanel(ctx)

  const editor = createEditor({
    parent: root,
    doc: initialDocument.content,
    isDark: ctx.theme.scheme === 'dark',
    extraExtensions: [
      controlsPanel.extensions,
      createPersistDocumentExtension(ctx),
    ],
  })

  ctx.ui.editor = editor
  ctx.theme.bind({ editor, themeButton: controlsPanel.themeButton })

  ctx.ui.drawer = new DocumentDrawer(ctx, {
    toggleButton: controlsPanel.toggleButton,
  })

  ctx.documents.setupHashNavigation()
}
