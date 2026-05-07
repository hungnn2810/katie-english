# Codex Agent Instructions

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.**

### When to use graph tools first

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of grep
- **Understanding impact**: `get_impact_radius` instead of manual import tracing
- **Code review**: `detect_changes` + `get_review_context`
- **Finding relationships**: `query_graph` with callers/callees/imports/tests
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to file scanning only when the graph does not cover the need.

### Recommended workflow

1. Start with `get_minimal_context(task="<task>")`.
2. Keep `detail_level="minimal"` unless more detail is required.
3. Use `detect_changes` for review, then `get_affected_flows` and `tests_for`.
4. Use `get_impact_radius` before risky refactors.

## Project skills (Codex)

Use these playbooks in `.codex/skills/` when relevant:

- `explore-codebase.md`
- `review-changes.md`
- `debug-issue.md`
- `refactor-safely.md`
