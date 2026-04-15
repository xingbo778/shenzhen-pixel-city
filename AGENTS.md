# Project Wiki Instructions

This repo uses a project-local LLM wiki at `.wiki/`.

## Scope

- Prefer `.wiki/` over any global wiki path
- Treat `.wiki/` as repo-scoped memory and research workspace
- Keep `.wiki/` out of git

## Structure

```text
.wiki/
├── _index.md
├── config.md
├── log.md
├── inbox/
│   └── .processed/
├── raw/
│   ├── articles/
│   ├── papers/
│   ├── repos/
│   ├── notes/
│   └── data/
├── wiki/
│   ├── concepts/
│   ├── topics/
│   ├── references/
│   └── theses/
└── output/
```

## Rules

1. Read `.wiki/_index.md` and relevant child `_index.md` files before scanning broadly.
2. Keep raw sources immutable after ingestion.
3. Compile synthesized notes into `.wiki/wiki/`; do not treat compiled articles as source dumps.
4. Update the touched directory indexes and append to `.wiki/log.md` after ingest, compile, or output operations.
5. Answer from `.wiki/` content first; if the wiki lacks evidence, say so and suggest what to ingest next.

## File Conventions

- Raw source files: `YYYY-MM-DD-descriptive-slug.md`
- Compiled article files: `descriptive-slug.md`
- Output files: `{type}-{topic}-{YYYY-MM-DD}.md`

## Frontmatter

### Raw source

```yaml
---
title: "Title"
source: "URL, filepath, or MANUAL"
type: article|paper|repo|note|data
ingested: YYYY-MM-DD
tags: [tag1, tag2]
summary: "2-3 sentence summary"
---
```

### Compiled article

```yaml
---
title: "Article Title"
category: concept|topic|reference|thesis
sources:
  - ../raw/type/file.md
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
confidence: high|medium|low
summary: "2-3 sentence summary"
---
```
