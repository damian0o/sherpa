---
name: context-query
description: Use when the user asks a question and the working directory is a repo-context store (has `.repo-context-meta.json` at the root) or a satellite (has `wiki/.repo-context-meta.json`). Reads the wiki to answer with cited links.
---

# context-query

Answer a user question by reading the connected coordination wiki and citing the pages used.

## Trigger

Activate when both:

1. The user is asking a question (typed query, not a command), AND
2. Detection finds either `./.repo-context-meta.json` (working inside a context-store) OR `./wiki/.repo-context-meta.json` (working inside a satellite). For satellites, all wiki paths below are prefixed with `wiki/`.

If multiple parent directories have the marker, prefer the closest one. Resolve git worktrees to their real repo root before checking.

Do not activate for commands (`/context-init`, `/context-connect`, etc.) — those have their own handlers.

## Procedure

1. **Read `index.md` first.** It sections content into Topics, Decisions, Principles, Sources. Use it to identify which pages are likely relevant.
2. **Route by question kind.** The category to start in depends on what's being asked:
   - **"How should we approach X?" / "What do we believe about X?"** → start in *Principles* (`principles/`). These questions ask for guidance, not state.
   - **"What's the current state of X?" / "How does X work?"** → start in *Topics* (`topics/`).
   - **"Why did we choose X?" / "When did we decide X?"** → start in *Decisions* (`decisions/`).
   - **"What does the article / conversation about X say?"** → start in *Sources* (`raw/`).

   If the question spans categories (e.g. "Why did we decide X and how is it implemented now?"), split it: route each clause to its category and cite from both.
3. **Drill into pages.** For each candidate, read it. Follow `[[wikilink]]` references when clearly relevant; do not read every linked page transitively.
4. **Synthesise the answer.** Compose a response in prose. Every claim from a wiki page cites it via `[[page-slug]]`. If the wiki doesn't cover the question, say so explicitly: "The wiki doesn't have a page on this; closest related pages are [[x]] and [[y]]."
5. **Offer to file the answer back — only when it earns a page.** After answering, judge whether the answer adds knowledge the wiki does not already capture. *Offer* to file when the answer is one of:
   - a stated **belief or principle** the wiki doesn't yet record;
   - a **point-in-time choice** (decision) the wiki doesn't yet record;
   - a **synthesis** that connects two or more pages in a way no single existing page does.

   Do **not** offer for routine one-off questions, restatements of what an existing page already says, or implementation lookups. When you do offer, phrase as: *"This might be worth filing as a new `<category>` page. Want me to draft one?"* — pick the category by the rubric: durable belief → principle; current operational state → topic; point-in-time choice → decision. Draft only after the user agrees, following the *Wiki maintenance discipline* in the wiki's `CLAUDE.md`.

## Citation discipline

- Every factual claim cites a wiki page via `[[slug]]`.
- If the answer combines information from multiple pages, cite each at the relevant claim.
- If the answer extrapolates beyond what any wiki page says, mark that part as your synthesis, not the wiki's claim: "Based on [[a]] and [[b]], it seems that..."

## Behavioral baseline

Follow the four operational principles from the contributor `CLAUDE.md`. In particular: push back on ambiguity. If the question is vague enough that the answer would require guessing, ask a clarifying question first.

## v0.1 limitation

No semantic search. Retrieval is index-driven — `index.md` plus directed reads. At small/medium wiki sizes this is sufficient. Larger wikis (post v1.0) may want an embedding layer; that's not in scope for v0.1.
