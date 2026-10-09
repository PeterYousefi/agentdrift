# Data model

Pydantic contracts in backend/app/models.py define agents, identities, resources, destinations, movement events, baselines, findings, cases, reports and containment actions. Operations are READ, WRITE, CONNECT and SEND. Timestamps must have a timezone and normalize to UTC. Integral bytes are stored; UI displays binary KiB/MiB-style values using the existing formatter's KB/MB labels (1 MB label = 1,048,576 bytes).

Event IDs are UUID5-derived from run ID and event index. A run receives a random opaque ID; replay of that run reproduces events. Fresh resets receive fresh IDs and preserve prior evidence and audit. The public demo runs one research agent; core detection tests cover independent agent and correlation isolation.

SQLite local documents and Azure Table entities share the get/put/list/delete abstraction. SHA-256 of an opaque 256-bit browser session token is the partition key. Entities are one event, run, finding, case, report or action per row. The system partition stores hashed session registrations and 24-hour expiry. Tokens never enter logs or stored evidence. Each session supports at most 12 runs. Expired partitions and registrations are cleaned during the active processor sweep.

The API adapts snake_case domain fields to the existing camelCase Lovable contract. Legacy overview field movement24h currently represents the current demo session; the live UI accurately labels it as session movement. Event history is anchored to a fixed synthetic epoch; ingest timestamps reflect actual processing time.
