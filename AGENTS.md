# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues managed via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage label vocabulary mapping (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Pull requests

Every pull request MUST follow this convention:

- **Title format**: `[<emoji><Type>] - <Title>` where `<emoji>` is a representative
  emoji for the change and `<Type>` is one of `Feature`, `Fix`, `Refactor`, `Docs`,
  `Chore`, `Test`, `Perf`, or whatever best fits.
  - Example: `[✨ Feature] - Add recurring payment reminders`
  - Example: `[🐛 Fix] - Prevent balance wipe on no-op purchase edit`
- **Labels**: Always label the PR. If a label for the change type does not exist yet,
  create it with the corresponding emoji. Reuse the same label for matching changes.
- **Assignee**: Always assign the PR to the requesting user.
- **Description**: Write a natural, human description explaining what was done and why
  (context, motivation, and outcome), not a bare bullet dump.
- **Base branch**: `development` unless explicitly told otherwise.
- Use `gh` CLI for creation and verify the PR URL is returned.

### Git Branching Rules

- **NEVER push to `development` directly**.
- If you are standing on the `development` branch and receive a new task, you MUST create a new branch (`git checkout -b <branch-name>`) for that task before making any changes.
