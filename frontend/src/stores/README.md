# src/stores/

Intentionally empty — and it should stay small.

The application deliberately avoids a global client store:
* server state is fetched per page with `useApi()` and revalidated on navigation,
* session/user identity comes from `/api/auth/me` inside the shell,
* there is no cross-page mutable state to desynchronise.

If you need shared client state later (e.g. a saved comparison basket), add a tiny store here
(Zustand or React context) — not a state-management framework. Anything that must survive a reload
belongs on the server, not in the browser.
