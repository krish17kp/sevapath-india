# Continue SevaPath with Codex

This kit continues the exact repository state left by Claude Code. It does not
rebuild the site and does not rerun the old Claude automation.

## Before starting

From the existing SevaPath project terminal:

```bash
npx vercel login
codex --version
```

GitHub is already authenticated as `krish17kp` according to the captured Claude
log. Vercel was logged out, so finish that login first.

If `codex` is not installed, use OpenAI's official Linux installer:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Run `codex` once and sign in with ChatGPT if requested.

## Install the handoff and start Codex

Extract this kit inside the existing SevaPath project, then run from the project
root:

```bash
bash sevapath-codex-continuation-kit/install_and_start.sh .
```

The script copies the continuation prompt into `claude-handoff/`, installs a
repository `AGENTS.md` only when one does not already exist, and opens Codex in
workspace-write mode. Network actions such as GitHub and Vercel may still ask
for approval. Approve only the exact verified repository/deployment actions.

If the session closes, reopen the same project and run:

```bash
codex resume
```

Do not run Claude and Codex against this project at the same time.
