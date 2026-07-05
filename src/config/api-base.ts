/**
 * Base URL prefix for frontend API calls.
 *
 * Empty by default (relative fetches, same-origin Express server). Only set
 * to an absolute URL when the frontend is built and hosted separately from
 * the backend (e.g. GitHub Pages + a Render-hosted API) — see
 * scripts/inject-vite-assets.js / .github/workflows/deploy-pages.yml.
 */
export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
