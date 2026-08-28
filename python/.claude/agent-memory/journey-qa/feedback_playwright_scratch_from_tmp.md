---
name: feedback-playwright-scratch-from-tmp
description: how to run ad-hoc Playwright/Node scripts against this repo from /tmp without installing anything or polluting the repo tree, and the pytest cwd gotcha
metadata:
  type: feedback
---

When told to audit without modifying app source (only scratch files under
`/tmp` allowed), a plain `node /tmp/script.mjs` importing `from "playwright"`
fails with `ERR_MODULE_NOT_FOUND` because Node ESM resolution looks relative
to the script's own path, not the cwd, and `NODE_PATH` does not reliably fix
ESM resolution on this Node version (22.23.2). The working approach: import
Playwright via an absolute path directly into the repo's installed copy, e.g.
`import { chromium } from "/abs/path/to/repo/node_modules/playwright/index.mjs"`.
Chromium was already installed at `~/.cache/ms-playwright/chromium-1234` in
this environment, so `chromium.launch()` works with no extra install step.

**Why:** Copying a scratch script into the repo root to dodge module
resolution (even briefly) trips `npm run lint`'s `no-console` rule against
the temp file and pollutes `git status`. Caught this mid-audit on SevaPath,
deleted the stray files, and re-verified `git status --short` matched the
pre-audit baseline before finishing. Better to solve resolution correctly
from the start than to touch the repo tree at all.

**How to apply:** For any future headless-browser audit task on a repo where
you must not touch app source: write the Playwright script under `/tmp`,
import the browser launcher via the target repo's absolute `node_modules`
path, start the dev server on a non-default port (`next dev -p <port>`,
never touch a build already running on the default port), and kill the dev
server when done. Also: this repo's Python tests
(`python3 -m pytest`) only resolve `sevapath_rag` when run with cwd
`python/` — running pytest from the repo root fails with
`ModuleNotFoundError`. Always `cd python && python3 -m pytest -q` here.
