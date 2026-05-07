# Explore Codebase (Codex)

Use the code-review-graph MCP tools to navigate and understand structure.

1. Run `list_graph_stats` for high-level metrics.
2. Run `get_architecture_overview` for module/community map.
3. Use `list_communities` + `get_community` to inspect key areas.
4. Use `semantic_search_nodes` for target symbols.
5. Use `query_graph` (`callers_of`, `callees_of`, `imports_of`) to trace dependencies.
6. Use `list_flows` + `get_flow` for execution paths.

## Token efficiency

- Start with `get_minimal_context(task="<task>")`.
- Keep `detail_level="minimal"` first.
- Escalate only when minimal context is insufficient.
