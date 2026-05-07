# Review Changes (Codex)

Perform risk-aware review with graph-first context.

1. Run `detect_changes` for risk-scored analysis.
2. Run `get_affected_flows` for impacted paths.
3. For high-risk symbols, run `query_graph` with `tests_for`.
4. Run `get_impact_radius` to assess blast radius.
5. Suggest targeted tests for untested risky changes.

## Output expectation

Group findings by risk level and include:
- what changed and why it matters
- coverage status
- concrete improvements
- merge recommendation

## Token efficiency

- Start with `get_minimal_context(task="<task>")`.
- Prefer `detail_level="minimal"`.
