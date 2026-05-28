import type { DocumentSummary } from '../documents/document-repository'

export type DrawerDocument = DocumentSummary & { isActive: boolean }

export type DocumentDrawerDeps = {
  onSelectDocument: (id: string) => void
}

const DATE_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export class DocumentDrawer {
  private readonly toggleButton: HTMLButtonElement
  private readonly drawer: HTMLElement
  private readonly list: HTMLUListElement
  private readonly backdrop: HTMLElement
  private readonly onSelectDocument: (id: string) => void
  private isOpen = false

  constructor(deps: DocumentDrawerDeps) {
    const toggle = document.querySelector<HTMLButtonElement>('#documents-toggle')
    const drawer = document.querySelector<HTMLElement>('#documents-drawer')
    const list = document.querySelector<HTMLUListElement>('#documents-list')
    const backdrop = document.querySelector<HTMLElement>('#documents-backdrop')

    if (!toggle || !drawer || !list || !backdrop) {
      throw new Error('Document drawer markup is missing')
    }

    this.toggleButton = toggle
    this.drawer = drawer
    this.list = list
    this.backdrop = backdrop
    this.onSelectDocument = deps.onSelectDocument

    this.toggleButton.addEventListener('click', () => this.toggle())
    this.backdrop.addEventListener('click', () => this.close())
  }

  renderDocuments(documents: DrawerDocument[]): void {
    this.list.replaceChildren()

    for (const doc of documents) {
      const item = document.createElement('li')
      item.className = 'documents-list__item'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'documents-list__button'
      if (doc.isActive) button.classList.add('is-active')

      const title = document.createElement('span')
      title.className = 'documents-list__title'
      title.textContent = doc.title

      const date = document.createElement('span')
      date.className = 'documents-list__date'
      date.textContent = this.formatDate(doc)

      button.append(title, date)
      button.addEventListener('click', () => {
        button.blur()
        this.onSelectDocument(doc.id)
        this.close()
      })
      item.append(button)
      this.list.append(item)
    }
  }

  close(): void {
    this.setOpen(false)
  }

  private toggle(): void {
    this.setOpen(!this.isOpen)
  }

  private setOpen(open: boolean): void {
    this.isOpen = open
    this.toggleButton.classList.toggle('is-open', open)
    this.toggleButton.textContent = open ? 'Close' : 'Docs'
    this.toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false')
    this.toggleButton.setAttribute('aria-label', open ? 'Close documents' : 'Open documents')
    this.drawer.classList.toggle('is-open', open)
    this.backdrop.classList.toggle('is-open', open)
    this.drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    this.backdrop.setAttribute('aria-hidden', open ? 'false' : 'true')
  }

  private formatDate(doc: DrawerDocument): string {
    return DATE_FORMATTER.format(new Date(doc.updatedAt))
  }
}
