---
name: context-onboard-satellite
description: Use when /context-connect has just attached the wiki submodule to a satellite repo and the wiki needs to be seeded with what already exists in that satellite. Also use when the user explicitly asks to re-onboard a connected satellite.
---

# context-onboard-satellite

Onboard a satellite repository into a connected `repo-context` wiki. The skill scans the satellite (currently with the `repo-scanner` sub-agent only — richer analyzers arrive in v0.4), proposes seed pages, and after user approval writes them into the wiki submodule.

## Trigger

- Invoked by `/context-connect` as its second-to-last step.
- Invoked explicitly by the user with phrasings like "re-onboard this satellite into the wiki", "scan this repo and seed the wiki", or similar.
- Activate only when the current working directory is the root of a git repository AND `wiki/.repo-context-meta.json` exists (i.e. the submodule is connected and points at a valid context-store).

## Procedure

1. **Dispatch `repo-scanner`.** Use the Task tool with `subagent_type: "repo-scanner"`. Pass the current working directory as context. Wait for the Repo Orientation Map output.
2. **Extract and confirm the satellite slug.** From `repo-scanner`'s "Satellite identifier" section, read `slug` and `derived_from`.
   - If `derived_from: origin`, use the slug as-is (it has no ` (unconfirmed)` suffix). No prompt needed.
   - If `derived_from` is anything else (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or `basename`), the slug field will be suffixed with ` (unconfirmed)` (e.g. `billing-service (unconfirmed)`). Strip the ` (unconfirmed)` suffix to get the bare slug. Before proposing any seed pages, prompt the user:

     > No origin remote on this satellite. Use slug `<bare-slug>` (derived from `<derived_from>`)? Reply `y` to accept, `n` to abort, or type a different slug to override.

   - On `y`: use the bare slug as-is.
   - On `n`: abort the onboarding cleanly. Do not write any wiki pages. Surface to the user that onboarding was aborted at their request and no changes were made.
   - On any other reply: treat it as a user-typed override. Normalise it (lowercase, non-alphanumeric → `-`) and use that as the slug for the remainder of this run.

   The confirmed (or overridden) slug is the value you put into `repos:` front-matter on every seed page.
3. **Read the existing wiki state.** Open `wiki/index.md`. List the existing topic and decision pages. For each existing topic page, read its front-matter and note its `repos:` array. This is what you reconcile against to avoid duplicating earlier-satellite content.
4. **Draft seed proposals.** Based on the Repo Orientation Map's "5-minute explanation" and "Cross-cutting surface", draft a small set of seed pages (typically 1–5 in v0.1; more analyzers arrive in v0.4). For each draft, decide:
   - **+ new topic** `wiki/topics/<slug>.md` — when the concern isn't already covered. `repos: [<satellite-slug>]`.
   - **extend existing topic** `wiki/topics/<existing-slug>.md` — when there's an existing page on the same concern from another satellite. Add `<satellite-slug>` to its `repos:` array; add a section to its body if appropriate.
   - **+ new decision** `wiki/decisions/<slug>.md` — only if the satellite's manifests or README clearly state an architectural decision (e.g. "we use Postgres", "we chose REST not GraphQL"). Be conservative.
5. **Present the proposals to the user as bullets.** Example:

   ```
   Proposed wiki seeds from <slug>:
   + new topics/runtime.md (Node.js 22 LTS, package.json:engines)
   + extend topics/api-contract.md (add <slug> to repos:; document GET /health endpoint)
   + new decisions/0001-use-fastify.md (chose Fastify over Express, per README L42)
   ```

   The user can accept all, accept some, edit individual items, or reject. Proceed to step 6 only after user approval.

6. **Write accepted seeds in a single commit inside the wiki submodule.**
   - `git -C wiki status --porcelain` — confirm the wiki working tree is clean. If non-empty, STOP and surface the uncommitted state to the user; do not auto-recover.
   - Determine the wiki's default branch: `git -C wiki remote show origin | awk '/HEAD branch/ {print $NF}'`. If empty (no origin configured), STOP and surface the state.
   - `git -C wiki checkout <default-branch>`.
   - For each accepted seed:
     - If "+ new" and the seed is a **topic** page: render `templates/topic.md` with `{{date}}` (today's ISO date) and `{{title}}` substituted; set `repos:` to `[<satellite-slug>]`; write the file under `wiki/topics/`.
     - If "+ new" and the seed is a **decision** page: render `templates/decision.md` with `{{date}}` and `{{title}}` substituted; write under `wiki/decisions/`. **Do not add a `repos:` field — decisions do not carry one** (see `wiki/CLAUDE.md`'s Conventions section).
     - If "extend" (always a topic page): surgical edit per the *Wiki maintenance discipline* in `wiki/CLAUDE.md` — only touch what's needed. Add `<satellite-slug>` to the topic's `repos:` array if not present. Add new sections only if proposed.
   - Update `wiki/index.md`: add a line per new page under the appropriate section (Topics or Decisions). Onboarding does not write to Principles or Sources in v0.1.
   - Append to `wiki/log.md`: `## [<date>] onboard | <satellite-slug>` followed by 2–4 bullet lines naming the seeds you wrote.
   - `git -C wiki add . && git -C wiki commit -m "Onboard <satellite-slug>: <N> seeds"`.
7. **Return to the satellite repo.** The caller (`/context-connect`) handles the submodule pointer bump and the satellite-side commit.

## Output

A short status summary to the user:
- Satellite slug used.
- Number of seeds proposed, accepted, written.
- Commit SHA inside the wiki submodule (so the user can verify).
- Reminder: the wiki submodule commit is staged locally; the user must push the wiki repo to share it.

## Behavioral baseline

Follow the four principles from the contributor `CLAUDE.md` (think before acting, simplicity first, surgical changes, goal-driven verifiable). Apply the *Wiki maintenance discipline* from `wiki/CLAUDE.md` to every page write.

## v0.1 limitation

In v0.1 only the `repo-scanner` sub-agent runs. That means seeds are based on manifests, README, and recent commits — not on AST-extracted API contracts or architectural pattern detection. The resulting wiki content is README-shaped, not contract-shaped. v0.3 adds `contracts-analyzer` (AST), v0.4 adds `architecture-analyzer` and `domain-analyzer`. Set user expectations accordingly: v0.1 onboarding is a starting point, not a finished wiki.
