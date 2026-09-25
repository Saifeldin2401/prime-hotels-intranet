# Altus Connect — product definition

Ratified 2026-09-25 (rebuild audit, decisions 1–5). This document is the
reference for scope decisions. It supersedes `docs/prd/` (the "Hospitality OS"
direction) and any document that describes the product as a hotel operations
or consulting platform.

## What the product is

A **multi-tenant training, knowledge and assessment platform for hospitality
groups**, operated by a platform team. Each customer organization runs its own
workspace: brands → hotels → departments → people.

The spine of the product is one loop:

**assign → learn → assess → certify → prove compliance**

with **knowledge search** alongside it. A screen that serves neither the loop
nor search has to justify its existence before it is built.

## Who uses it

| Actor | Job | Value-creating action |
| --- | --- | --- |
| Learner (hotel staff) | Know what I must complete and by when; find the right SOP fast | Completes assigned course, passes the quiz, earns a certificate |
| Author | Turn source documents into courses and quizzes quickly | Drafts (with AI) and submits a course or article for review |
| Knowledge manager | Keep SOPs and articles correct and findable | Reviews, publishes and retires knowledge content |
| Training manager | Prove compliance per hotel and department | Assigns training, follows up on overdue work, exports evidence |
| Org admin | Run the organization: people, structure, settings | Invites members, sets roles, maintains hotels and departments |
| Platform operator | Onboard and support organizations, supply master content | Provisions an organization, deploys the master library, enters an organization under audit |

## Decisions (2026-09-25)

1. **Identity.** Learning and knowledge platform as above. Working name:
   Altus Connect. The app no longer describes itself as a hotel operations or
   consulting platform.
2. **Marketing pages leave the app.** `/about`, `/vision-2030`, `/methodology`,
   `/case-studies`, `/leadership`, `/digital` move to a separate marketing
   site. The app's public surface is sign-in and certificate verification.
3. **Rename in the database, not just the UI.** `training_modules` →
   `courses`, `learning_quizzes` → `quizzes`, `training_assignment_rules` →
   `assignments`, lesson content out of `documents` into `lessons` /
   `lesson_blocks` (Phase 2).
4. **Secondary modules.** Keep learning paths. Defer classroom sessions (ILT)
   and the competency framework: tables archived, no UI. Delete gamification
   (achievements) and motivational content.
5. **Security first.** Certificate forgery and cross-tenant skills writes
   were fixed before any rebuild work (Phase 0).

## Vocabulary

| Concept | Official name | Do not use |
| --- | --- | --- |
| Unit of training with lessons and a quiz | Course | module, training, track, program |
| Part of a course | Lesson | block, training block, step |
| Scored test | Quiz | assessment (reserved for practical assessments), exam |
| Requirement to complete | Assignment | enrollment, learning assignment |
| Proof of completion | Certificate | credential |
| SOP, guide or policy | Article (type: SOP / Guide / Policy) | document, wiki page |
| Customer company | Organization | tenant (operator console and code only), company |
| Physical location | Hotel | property |
| Platform staff | Operator | super admin |

The full audit, target architecture and phase plan:
[Altus Connect Rebuild Audit](https://claude.ai/artifact/SfJuWKppoAQTAYULs5fcWB).
