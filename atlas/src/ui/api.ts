export interface ApiResult<T> { ok: boolean; data?: T; error?: string }

// Same-origin '/api' by default (Vite dev proxy locally, nginx in production). Set VITE_API_BASE at build time only
// when the API lives on a different origin. Build-time public value - never put secrets here.
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const r = await fetch(API_BASE + url, init)
    if (!r.ok) {
      let detail = `${r.status} ${r.statusText}`
      try { const j = await r.json(); detail = j.detail ?? detail } catch { /* ignore */ }
      return { ok: false, error: String(detail) }
    }
    return { ok: true, data: (await r.json()) as T }
  } catch (e) {
    const hint = import.meta.env.DEV ? ' Start it with: uvicorn app.main:app --port 8000' : ' Please try again shortly.'
    return { ok: false, error: `Backend unreachable (${(e as Error).message}).${hint}` }
  }
}

export interface HorizonsResult { source: string; body: string; date: string; vector_au: [number, number, number] | null; raw_excerpt: string }

/** The backend serves only what the UI uses: a health ping and the JPL Horizons check in the planet Inspector. */
export const api = {
  health: () => call<{ status: string; connectors: string[] }>('/api/health'),
  horizons: (body: string, date: string) => call<HorizonsResult>(`/api/catalogue/horizons?body=${encodeURIComponent(body)}&date=${encodeURIComponent(date)}`),
}
