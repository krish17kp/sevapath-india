# Start here

This package intentionally contains no website. Claude Code will create the
complete SevaPath project inside this same folder.

## Run on Linux Mint from VS Code

1. Extract this ZIP.
2. Open the extracted `sevapath-claude-build-from-scratch-v3` folder in VS Code.
3. Open the integrated terminal.
4. Run `claude` once and complete sign-in if required, then type `/exit`.
5. Run:

   ```bash
   chmod +x claude-handoff/run_claude_auto.sh
   bash claude-handoff/run_claude_auto.sh
   ```

Leave VS Code and the terminal open. When Claude finishes, read
`claude-handoff/FINAL_REPORT.md` and run the exact preview command written there.

Do not use the older V2 package. It expected an existing website and is not
suitable for this from-scratch build.

