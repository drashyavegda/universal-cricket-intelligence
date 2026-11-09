# src/services/

Maps the browser's access to the API. Live file: `lib/client/api.ts`.

| Function | Purpose |
| --- | --- |
| `apiGet<T>(url)` | typed GET with `cache: 'no-store'`; throws on non-2xx with the server message |
| `apiPost<T>(url, body, method?)` | POST/PATCH/DELETE with JSON body |
| `useApi<T>(url, deps)` | loading/data/error/reload hook used by every workspace page |

Rules: components never call `fetch('/api/…')` directly (except the upload route, which needs
`FormData` and progress). Errors must surface to the user, never be swallowed.
