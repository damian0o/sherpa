---
name: context-connect
description: Connect the current satellite repo to a repo-context wiki by adding it as a git submodule at ./wiki/. Then invoke context-onboard-satellite to propose seed pages. Use when the user wants their satellite repo (frontend, backend, infra) to participate in the shared wiki.
argument-hint: "<wiki-remote-url>"
---

# /context-connect

Connect the current satellite repository to an existing `repo-context` wiki. After this command, the wiki lives as a git submodule at `./wiki/` and the plugin's satellite-side skills activate automatically.

## Preconditions

1. Current working directory is the root of a git repository (`git rev-parse --show-toplevel` succeeds and equals `pwd`).
2. There is no existing `wiki/` directory or submodule. Re-runs require the user to remove the existing one first.
3. `<wiki-remote-url>` was provided. If not, ask the user.

## Steps

1. **Verify preconditions.** Run `git rev-parse --show-toplevel` and confirm it matches `pwd`. If `wiki` already exists as a path or submodule, STOP and tell the user.
2. **Add the submodule.** Run `git submodule add <wiki-remote-url> wiki`.
3. **Init recursive (defensive).** Run `git submodule update --init --recursive`.
4. **Verify the wiki marker.** Confirm `wiki/.repo-context-meta.json` exists and parses as JSON with `"kind": "repo-context-store"`. If not, STOP — the URL didn't point to a valid context-store.
5. **Stitch the satellite fragment into CLAUDE.md.** If the satellite has no `CLAUDE.md`, create it with just the fragment. If it does, append (or replace if already present) the section between the markers:

   ```
   <!-- BEGIN repo-context -->
   ...content from plugins/repo-context/templates/satellite-CLAUDE.md...
   <!-- END repo-context -->
   ```

   Idempotency: if the markers already exist, replace the section between them; do not duplicate.
6. **Invoke `context-onboard-satellite` skill.** This is the skill that reads the satellite's structure and proposes wiki seed pages. Pass control to it now.
7. **Append a log entry to the wiki.** After `context-onboard-satellite` returns, append a line to `wiki/log.md`:

   ```
   ## [<date>] connect | <satellite-slug>
   ```

   Where `<satellite-slug>` is the slug from `repo-scanner`'s output and `<date>` is today's ISO date. Stage but do not push.
8. **Commit the satellite repo.** Stage `wiki/`, `.gitmodules`, and the updated `CLAUDE.md`. Commit with message `Add repo-context wiki submodule`. Do not push.

## Idempotency

`/context-connect` refuses to run if `wiki/` already exists. To re-connect (e.g. to a different store), the user must `git submodule deinit wiki && git rm wiki && rm -rf .git/modules/wiki` first.

## Behavioral baseline

Same four principles from the contributor `CLAUDE.md`. In particular: do not push commits; the user reviews and pushes.
