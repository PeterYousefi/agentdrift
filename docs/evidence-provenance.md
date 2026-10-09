# Evidence provenance

Events are validated and persisted before detection. An existing event ID is accepted idempotently only when its semantic content agrees; conflicting duplicates are rejected. Ingest timestamps are excluded from duplicate comparison.

Findings record feature vector, baseline, version, window and exact event IDs. Cases link those IDs. The graph derives nodes and edges from those stored events; each operation edge cites an event ID. READ flows from resource to agent; WRITE/CONNECT/SEND flow from agent to target. The graph is a relationship reconstruction, not proof that the same byte payload traversed all edges.

Reports cite only case evidence IDs. Validation checks case identity, allowed categories, factual citations and every referenced ID. A citation can prove provenance without proving that an LLM's prose faithfully interprets the cited event; semantic verification remains a limitation. No event content is transferred to external destinations during suspicious scenarios.
