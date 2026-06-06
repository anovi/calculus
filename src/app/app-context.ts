import type { EditorInstance } from '../editor'
import type { DocumentDrawer } from '../drawer'
import {
  AppPreferencesStore,
  DocumentRepository,
  DocumentSession,
  type ActiveDocument,
} from '../documents'
import { DEFAULT_DOC } from './default-document'
import { createDocumentActions, type DocumentActions } from './document-actions'
import { createThemeController, type ThemeController } from './theme-controller'

export type AppContext = {
  readonly repository: DocumentRepository
  readonly preferencesStore: AppPreferencesStore
  readonly session: DocumentSession
  documents: DocumentActions
  theme: ThemeController
  ui: {
    editor: EditorInstance | null
    drawer: DocumentDrawer | null
  }
}

export type CreateAppContextOptions = {
  firstDocumentContent?: string
}

export async function createAppContext(
  options: CreateAppContextOptions = {},
): Promise<{ ctx: AppContext; initialDocument: ActiveDocument }> {
  const repository = new DocumentRepository()
  const preferencesStore = new AppPreferencesStore()
  const session = new DocumentSession({
    repository,
    preferencesStore,
    firstDocumentContent: options.firstDocumentContent ?? DEFAULT_DOC,
  })
  const theme = await createThemeController(preferencesStore)

  const ctx: AppContext = {
    repository,
    preferencesStore,
    session,
    theme,
    documents: null as unknown as DocumentActions,
    ui: { editor: null, drawer: null },
  }

  ctx.documents = createDocumentActions(ctx)
  const initialDocument = await session.initialize()

  return { ctx, initialDocument }
}
