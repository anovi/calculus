import type { DocumentSummary } from '../documents'

export type DrawerDocument = DocumentSummary & { isActive: boolean }

export type DocumentDrawerDeps = {
  toggleButton: HTMLButtonElement
  onSelectDocument: (id: string) => void
  onClose?: () => void
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
  private readonly onClose?: () => void
  private isOpen = false

  constructor(deps: DocumentDrawerDeps) {
    const drawer = document.querySelector<HTMLElement>('#documents-drawer')
    const list = document.querySelector<HTMLUListElement>('#documents-list')
    const backdrop = document.querySelector<HTMLElement>('#documents-backdrop')

    if (!drawer || !list || !backdrop) {
      throw new Error('Document drawer markup is missing')
    }

    this.toggleButton = deps.toggleButton
    this.drawer = drawer
    this.list = list
    this.backdrop = backdrop
    this.onSelectDocument = deps.onSelectDocument
    this.onClose = deps.onClose

    this.backdrop.addEventListener('click', () => this.close())
    this.setOpen(false)
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

  toggle(): void {
    this.setOpen(!this.isOpen)
  }

  private setOpen(open: boolean): void {
    const wasOpen = this.isOpen
    this.isOpen = open
    this.toggleButton.classList.toggle('is-open', open)
    this.toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false')
    this.toggleButton.setAttribute('aria-label', open ? 'Close documents' : 'Open documents')
    this.drawer.classList.toggle('is-open', open)
    this.backdrop.classList.toggle('is-open', open)
    this.drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    this.backdrop.setAttribute('aria-hidden', open ? 'false' : 'true')
    if (wasOpen && !open) {
      this.onClose?.()
    }
  }

  private formatDate(doc: DrawerDocument): string {
    return DATE_FORMATTER.format(new Date(doc.updatedAt))
  }
}
