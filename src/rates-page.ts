import './style.css'
import { registerSW } from 'virtual:pwa-register'

const API_BASE = 'https://api.frankfurter.dev/v2/rates'

/** Major quotes to request; the API returns only rows it has data for. */
const QUOTES = [
  'USD',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'NZD',
  'CNY',
  'INR',
  'BRL',
  'MXN',
  'KRW',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'HUF',
  'CZK',
  'RON',
  'TRY',
  'ZAR',
  'SGD',
  'HKD',
  'ILS',
  'THB',
  'IDR',
  'PHP',
].join(',')

type RateRow = {
  date: string
  base: string
  quote: string
  rate: number
}

function buildRatesUrl(): string {
  const params = new URLSearchParams({
    base: 'EUR',
    quotes: QUOTES,
  })
  return `${API_BASE}?${params.toString()}`
}

function formatRate(value: number): string {
  if (value >= 100) return value.toFixed(2)
  if (value >= 1) return value.toFixed(4)
  return value.toFixed(6)
}

function renderLoading(root: HTMLElement): void {
  root.innerHTML = `
    <div class="shell">
      <header class="header">
        <h1 class="title">EUR exchange rates</h1>
        <p class="subtitle">Loading from Frankfurter…</p>
      </header>
      <main class="card" aria-busy="true">
        <div class="skeleton-grid" aria-hidden="true">
          ${Array.from({ length: 8 }, () => '<div class="skeleton-row"></div>').join('')}
        </div>
      </main>
    </div>
  `
}

function renderError(root: HTMLElement, message: string): void {
  root.innerHTML = `
    <div class="shell">
      <header class="header">
        <h1 class="title">EUR exchange rates</h1>
        <p class="subtitle status status--error">${message}</p>
      </header>
      <main class="card">
        <p class="hint">If you opened this page before while online, try again: cached rates may still load when the network is unavailable.</p>
        <button type="button" class="btn" id="retry">Retry</button>
      </main>
    </div>
  `
  document.getElementById('retry')?.addEventListener('click', () => loadRates(root))
}

function renderRates(
  root: HTMLElement,
  rows: RateRow[],
  meta: { fetchedAt: string },
): void {
  const sorted = [...rows].sort((a, b) => a.quote.localeCompare(b.quote))
  const dateLabel = sorted[0]?.date ?? '—'
  const online = navigator.onLine
  const statusHtml = online
    ? '<span class="pill pill--ok">Online</span>'
    : '<span class="pill pill--muted">Offline · cached rates</span>'

  root.innerHTML = `
    <div class="shell">
      <header class="header">
        <h1 class="title">1 EUR equals</h1>
        <p class="subtitle">
          ECB-blended daily rates via <a href="https://www.frankfurter.app/" target="_blank" rel="noreferrer">Frankfurter</a>
          · date <strong>${dateLabel}</strong>
        </p>
        <div class="meta-row">
          ${statusHtml}
          <span class="pill pill--muted">Updated locally ${meta.fetchedAt}</span>
        </div>
      </header>
      <main class="card">
        <table class="rates" aria-label="EUR to foreign currency rates">
          <thead>
            <tr><th>Currency</th><th class="num">Rate (per 1 EUR)</th></tr>
          </thead>
          <tbody>
            ${sorted
              .map(
                (r) => `
              <tr>
                <td><span class="ccy">${r.quote}</span></td>
                <td class="num mono">${formatRate(r.rate)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        <p class="footnote">Installable PWA: assets and the last successful API response are cached for offline use.</p>
      </main>
      <footer class="footer">
        <button type="button" class="btn btn--ghost" id="refresh">Refresh</button>
      </footer>
    </div>
  `

  document.getElementById('refresh')?.addEventListener('click', () => loadRates(root))
}

async function loadRates(root: HTMLElement): Promise<void> {
  renderLoading(root)
  const url = buildRatesUrl()
  const fetchedAt = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  try {
    const res = await fetch(url, { cache: 'default' })
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`)
    }
    const data: unknown = await res.json()
    if (!Array.isArray(data)) {
      throw new Error('Unexpected API response')
    }
    const rows = data as RateRow[]
    if (rows.length === 0) {
      throw new Error('No rates returned')
    }
    renderRates(root, rows, { fetchedAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    renderError(root, message)
  }
}

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) {
  throw new Error('#app missing')
}

registerSW({ immediate: true })

window.addEventListener('online', () => loadRates(root))
window.addEventListener('offline', () => loadRates(root))

void loadRates(root)
