# Refactor Safely (Codex)

Use dependency-aware graph analysis before and after refactors.

1. Run `refactor_tool` with `mode="suggest"` for candidates.
2. Run `refactor_tool` with `mode="dead_code"` for safe removals.
3. For renames, preview with `refactor_tool` `mode="rename"`.
4. Apply with `apply_refactor_tool` only after preview review.
5. Run `detect_changes` and `get_affected_flows` after refactor.

## Safety checks

- Check `get_impact_radius` before broad changes.
- Confirm test coverage via `query_graph` (`tests_for`) for touched code.

## Token efficiency

- Start with `get_minimal_context(task="<task>")`.
- Prefer `detail_level="minimal"` first.
