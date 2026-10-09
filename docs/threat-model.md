# Basic threat model

Assets: session credentials, synthetic evidence integrity, provider credentials, cloud spending and human decision audit. Actors: anonymous visitors, malicious metadata producers and an untrusted model response. Trust boundaries: browser/API, ingestion/processor, API/storage and evidence/model.

Controls: 256-bit opaque session bearer token in sessionStorage; hashed partition lookup; all case/run/action reads scoped to the session; 24-hour expiry; 12-run session limit; 64 KiB request bound; validated operations/bytes/timestamps; 4 KiB metadata bound; rate limit 240 requests/IP/minute; trusted ingestion disabled without a server token; exact CORS allowlist; HTTPS public ingress; production durable-store requirement; scoped managed identity; no external arbitrary URL fetching; no cloud execution authority; explicit backend containment transitions; citation validation and deterministic fallback.

Run and case IDs alone grant no access. Shared-browser token theft through XSS remains a risk. CORS is not authentication. There is no authenticated human identity: approval means an explicit action by the session holder, not a verified person. Audit rows are application-controlled and not cryptographically tamper-evident.

Rate limits are in-process and reset on restart. They are not a global distributed abuse defense. Anonymous session creation and inbound request floods remain resource/cost risks. A distributed gateway quota, stronger global caps, CSP review and distributed write consistency are future hardening work. Azure budgets are delayed notifications, not a hard dollar ceiling. The prototype should not accept real enterprise documents or be used as a production security system.
