## Backend Rule: Prisma Schema Changes

**IMPORTANT: Whenever `backend/prisma/schema.prisma` is modified, you MUST also update `docs/db/`.**

### What to update

| Thay đổi schema | File docs/db cần sửa |
|-----------------|----------------------|
| Thêm/xóa/sửa model `User`, `Student`, `ParentInfo` | `users-auth.md` |
| Thêm/xóa/sửa model `Class` | `classes.md` |
| Thêm/xóa/sửa model `Homework`, `HomeworkPart`, `HomeworkWord`, `HomeworkAssignment`, `HomeworkAssignmentClass` | `homework.md` |
| Thêm/xóa/sửa model `HomeworkSession`, `SpeakingResult`, `PhonicsItemResult`, `ReadingResult`, `ListenItemResult` | `sessions-results.md` |
| Thêm/xóa/sửa model `VocabItem`, `ListenItem`, `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice` | `content.md` |
| Thêm/xóa/sửa model `Phoneme`, `Word`, `WordPhoneme` | `phonics.md` |
| Thêm/xóa/sửa model mới không thuộc nhóm trên | Tạo file mới + cập nhật `README.md` |
| Thêm/xóa enum | `README.md` (bảng Enums) |
| Thêm model mới hoặc đổi tên table | `README.md` (bảng Tables + sơ đồ quan hệ) |

### Quy tắc

- Cập nhật docs **trong cùng commit** với thay đổi schema — không để docs lạc hậu.
- Mô tả column phải khớp với schema thực tế (type, nullable, default, FK, unique).
- Nếu column có ý nghĩa đặc biệt (JSON structure, business logic), ghi chú rõ.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
