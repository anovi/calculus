import { isMobileDevice } from '../lib/mobile-device'
import type { DrawerDocument } from '../drawer'
import type { AppContext } from './app-context'

export type DocumentActions = {
  listForDrawer(): Promise<DrawerDocument[]>
  open(id: string): Promise<void>
  create(): Promise<void>
  setupHashNavigation(): void
}

export function createDocumentActions(ctx: AppContext): DocumentActions {
  return {
    async listForDrawer() {
      const docs = await ctx.session.listDocuments()
      const active = ctx.session.getActiveDocumentId()
      return docs.map((doc) => ({ ...doc, isActive: doc.id === active }))
    },

    async open(id) {
      const doc = await ctx.session.openDocument(id)
      ctx.ui.editor?.setDocument(doc.content)
      if (!isMobileDevice()) ctx.ui.editor?.view.focus()
    },

    async create() {
      const doc = await ctx.session.createAndOpenDocument()
      ctx.ui.editor?.setDocument(doc.content)
      ctx.ui.drawer?.close()
      if (!isMobileDevice()) ctx.ui.editor?.view.focus()
    },

    setupHashNavigation() {
      ctx.session.onHashNavigation((id) => {
        void this.open(id)
      })
    },
  }
}
