---
name: warm-feature-flow
description: Warm the agent, reset git to a clean base branch, then work and create a draft PR.
---

# Warm Feature Flow

Use this at the start of a new feature to ensure the repo is clean, the agent is warmed, and the draft PR flow is ready at the end.

## Steps

1. **VCS check**
   - If `.jj/` exists, use `jj`; otherwise use `git`.
   - Run `status` and confirm there are no unrelated changes. If there are, stop and ask the user what to do.

2. **Reset to base branch**
   - Checkout base branch (`dev` for normal development, `master` only for releases).
   - Pull latest changes.

3. **Create a fresh feature branch**
   - Branch name format: `feat/<short-scope>` or `fix/<short-scope>`.

4. **Warm the agent**
   - Run the warm-agent workflow (Task tool, subagent `warm-agent`).
   - Focus on current feature area only; avoid unrelated exploration.

5. **Implement the feature**
   - Make changes, run relevant tests if needed.

6. **Create draft PR**
   - Run the `create-draft-pr` skill (or `gh pr create --draft` if needed).

## Notes

- If the base branch is behind, always pull before branching.
- If you must keep local changes, create a separate branch or stash before continuing.
