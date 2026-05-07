# Debug Issue (Codex)

Use graph tools to trace faults systematically.

1. Use `semantic_search_nodes` to locate relevant code.
2. Use `query_graph` with `callers_of` and `callees_of` for call chains.
3. Use `get_flow` on suspected paths.
4. Use `detect_changes` to correlate with recent edits.
5. Use `get_impact_radius` on suspected nodes/files.

## Token efficiency

- Start with `get_minimal_context(task="<task>")`.
- Keep `detail_level="minimal"` unless blocked.
