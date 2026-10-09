# Frontend audit

Inspected 2026-10-09. The frontend root is `lovable/`; the parent directory initially had no Git repository, and no nested Git metadata was present.

## Existing implementation

React 19, TypeScript, Vite 8, TanStack Start and file-based TanStack Router. Tailwind 4 and Radix components provide the existing design system. TanStack Query handles API queries. React Flow renders movement graphs behind ClientOnly for SSR compatibility. Recharts renders charts. Vitest, Testing Library and jsdom are configured.

Routes cover overview, investigations and detail, agents and detail, movement, detection, playground, investigator, response and architecture. `src/api/contract.ts` defines AgentDriftApi. `http-adapter.ts` implements proposed endpoints with Zod validation for agents, events and investigations; other responses currently use unchecked casts. `index.ts` selects the mock adapter by default, including when live configuration is missing.

`src/fixtures` supplies deterministic synthetic data. `src/lib/detector.ts` computes frontend demonstration scores. `demo-store.ts` uses sessionStorage for tour, playback, containment and audit state. These are browser simulations, not evidence of a Python pipeline or Azure deployment. The README correctly labels synthetic data and unmeasured evaluation.

## Integration approach

Preserve routes, typography, navigation, components, React Flow rendering and layouts. Implement Python domain models and adapt backend responses to the existing camelCase UI contract. Extend the HTTP adapter with opaque session credentials and validated response schemas. Replace local playback and containment operations incrementally with persisted API state and live updates. Graph edges will reference stored event IDs. Keep synthetic indicators; explicitly identify deterministic reports and disconnected service states.

The bundled Lovable config builds TanStack Start with a Nitro/Cloudflare target. Static Azure hosting requires a verified client-only build or a justified Azure runtime option; an SSR output cannot simply be uploaded as a static SPA.

## Tools and validation

Node 24.18.0, Python 3.14.7, Git 2.43.0, GitHub CLI 2.101.0 and Azure CLI 2.90.0 are installed. GitHub keyring authentication works with network permission. Azure reports two enabled student subscriptions. No cloud provisioning has occurred.

Installation, build, lint and tests are pending; results will be recorded after execution.
