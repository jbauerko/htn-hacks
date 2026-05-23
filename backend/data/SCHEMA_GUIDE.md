# Volunteer Module YAML Schema Guide

This guide is for the agent (or human) generating module YAML files from source documents.
The full machine-readable schema is at `module_schema.json`.

## Overview

Each file in `backend/data/modules/` describes **what a volunteer needs to know** — not how they'll be tested. The application generates scenarios and quizzes from this content automatically.

**One file = one volunteer role.**

## File naming

Filename must match the `id` field: `registration.yaml` → `id: registration`.
Use lowercase letters and hyphens only. No spaces.

## Required fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Kebab-case slug, matches filename |
| `name` | string | Human-readable role name |
| `description` | string | 1–2 sentences about the role |
| `icon` | string | Single emoji |
| `color` | string | One of: `indigo` `emerald` `amber` `rose` `violet` `cyan` `orange` `sky` `teal` `pink` |
| `knowledge` | array | At least 3 items (see below) |

## Optional fields

| Field | Type | Notes |
|---|---|---|
| `rules` | array of strings | Non-negotiable, always-follow policies |
| `glossary` | array of `{term, definition}` | Event-specific jargon |

## Knowledge items

Each item in `knowledge` captures one concept, procedure, or policy:

```yaml
knowledge:
  - title: Short heading
    content: >
      Full explanation in plain language. Write as if briefing a brand-new volunteer
      who has never worked this event before. Be specific about what to do, in what
      order, and why. Multiple paragraphs are fine — use the YAML block scalar (>).
    tags: [procedure]   # optional
```

**Recommended tags:** `critical`, `procedure`, `policy`, `safety`, `escalation`, `communication`, `operations`

Tag items `critical` if getting them wrong would cause real harm or a serious event issue.

## Rules

Short, imperative sentences. These become hard constraints in the game (breaking them = big point deduction):

```yaml
rules:
  - Never do X without doing Y first.
  - Always escalate Z to a supervisor.
```

## Glossary

Event-specific terms the volunteer might not know:

```yaml
glossary:
  - term: Wristband
    definition: The color-coded band issued at check-in that grants access to specific areas.
```

## Quality checklist (for the generating agent)

Before emitting a module file, verify:

- [ ] `id` matches filename stem exactly
- [ ] `knowledge` has at least 5 items for a substantive module
- [ ] Every `critical`-tagged item explains not just *what* to do but *why*
- [ ] `rules` are short enough to be memorable (≤ 15 words each)
- [ ] `content` is written in second person ("you") or plain imperative, not passive voice
- [ ] No question-and-answer pairs, quiz items, or scoring hints — those belong in the game, not here
- [ ] `color` is one of the allowed values

## Example

See `example.yaml` in this directory.
