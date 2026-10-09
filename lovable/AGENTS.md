<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AgentDrift
- All data access goes through `src/api` (`AgentDriftApi` contract with mock + HTTP adapters) — lets the Azure backend replace fixtures without touching pages.
- Local demo state (containment, audit, tour, playback) lives in `src/lib/demo-store.ts` in sessionStorage — no backend dependency for the public demo.
- Fixture scores are computed by `src/lib/detector.ts`, never hand-typed — keeps every page consistent.
- React Flow graphs render inside `ClientOnly` — SSR can't measure nodes, so fitView fails otherwise.
