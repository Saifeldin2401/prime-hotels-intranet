# Altus Connect — unique page inventory

Working list for the page-by-page experience phase. One row per unique page
(routes that render the same component with a parameter count once).

Status: **Redesigned** = rebuilt on `src/ui` around its job ·
**Other session** = being changed in a parallel session, do not touch ·
**Legacy** = functional, not yet redesigned.

## A. Workspace homes

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/learn` | My day (`LearnerHome`) | Every member | Know what is required today | Resume / start required item | Redesigned |
| `/studio` | My content (`MyContentPage`) | Author | Continue drafts, answer feedback | Continue draft | Redesigned |
| `/manage/risk` | Risk queue (`RiskQueuePage`) | Training / department manager | Find and act on compliance risk | Follow up | Redesigned |
| `/admin/organization` | Overview (`OverviewPage`) | Org / hotel admin | Clear setup blockers | Resolve gap | Redesigned |
| `/platform` | Exceptions (`ExceptionsPage`) | Operator | Resolve failing organizations and jobs | Open exception | Redesigned |

## F. Learning pages

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/learn/courses` | Explore (`ExplorePage`) | Member | Find a course | View course | Redesigned |
| `/learn/courses/:id` | Course detail (`CourseDetail`) | Member | Decide to start; know what finishing gives | Start / Resume | Redesigned (phase 2) |
| `/learn/player/:id` | Course player (`TrainingPlayer`) | Member | Complete lessons | Next / Complete | Other session (player shell) |
| `/learn/quizzes/:id` | Quiz (`AssessmentPlayer`) | Member | Pass the quiz | Submit | Frame redesigned (calm header; fake integrity badge removed) |
| `/learn/my` | My learning (`MyLearningPage`) | Member | See all assigned work | Resume | Redesigned (phase 2) |
| `/learn/paths` | Learning paths (`TrainingPaths`) | Member | Follow a role path | Continue path | Redesigned (capability-gated management) |
| `/learn/certificates` | My certificates (`MyCertificates`) | Member | Prove and share qualifications | Download / verify | Redesigned (phase 2) |

## G. Knowledge pages

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/knowledge` | Knowledge hub (`KnowledgeHubPage`) | Member | Find a trusted answer | Search | Redesigned |
| `/knowledge/:id` | Article reader (`KnowledgeRead`) | Member | Read, trust, acknowledge | Acknowledge | Redesigned (phase 2: editorial header + trust band, acknowledgement as conclusion) |
| `/documents`, `/documents/:id` | Files (`DocumentLibrary`, `DocumentDetail`) | Member | Open an attachment | Download | Library header redesigned (invented 10 GB quota removed); detail legacy |

## D. Creation / authoring

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/studio/create` | Create (`CreatePage`) | Author | Start the right kind of content | Choose a start | Redesigned |
| `/studio/courses`, `/studio/courses/:id` | Course library + builder (`TrainingHub`, `TrainingBuilder`) | Author | Build a course | Save / submit | Other session (builder steps) |
| `/studio/articles/new`, `/:id/edit` | Article author (`KnowledgeAuthor`) | Author | Write an SOP | Save / submit | Legacy |
| `/studio/articles` | Article library (`KnowledgeBrowse`) | Author | Manage articles | Edit | Header + filters redesigned (light, no hero) |
| `/studio/quizzes`, `/new`, `/:id`, `/generate` | Quiz bank / builder / generator | Author | Build a quiz | Save | Bank header redesigned; builder/generator legacy |
| `/studio/questions/*` | Question editor / review | Author | Edit a question | Save | Legacy |
| `/studio/media` | Media library | Author | Manage assets | Upload | Header redesigned (KPI strip folded into context) |

## E. Review / approval

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/studio/review` | Review queue (`ContentReviewQueue`) | Publisher | Approve or return work, oldest first | Approve / request changes | Redesigned (phase 2) |
| `/studio/review/articles` | Article review (`KnowledgeReview`) | Knowledge manager | Approve articles | Approve | Header + status chips redesigned (misleading stats removed) |

## H. Management

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/manage/assignments` (+ `/quizzes`, `/rules`) | Assignment centre | Training manager | Assign and track | Assign | Header + rules page redesigned; embedded panel legacy |
| `/manage/tracking` | Course tracking | Manager | Course-level progress | Follow up | Legacy |
| `/manage/team` | Team progress (`TeamProgress`) | Manager | Compare departments | Open department | Redesigned (phase 2) |
| `/manage/certificates` (+ `/issue`) | Certificate register | Manager | Issued / expiring / manual issue | Issue | Redesigned (register with expiry filters; QR fixed) |
| `/manage/compliance` | Compliance trends | Manager | Trends over time | – | Redesigned (figures strip, calm chart, underline tabs) |
| `/manage/reports` (+ `/builder`) | Evidence | Manager / auditor | Export evidence | Export | Redesigned (evidence index, capability-filtered) |
| `/manage/skills` | Skills matrix | Manager | Skill coverage | – | Header + figures redesigned |

## I. Organization

| Route | Page | User | Job | Primary action | Status |
| --- | --- | --- | --- | --- | --- |
| `/admin/users` (+ `/bulk`) | People | Org admin | Manage members | Invite / edit | Header + seat logic redesigned; roster legacy |
| `/admin/invitations` | Invitations | Org admin | Track invites | Resend | Redesigned (grouped by status; no invented seat default) |
| `/admin/structure` | Hotels & departments | Org admin | Shape the hierarchy | Add / edit | Redesigned (hierarchy first) |
| `/admin/properties` | Property management | Org admin | Hotel details | Edit | Legacy |
| `/admin/audit` | Audit trail (`AuditPage`) | Org admin | Who did what | Filter / export | Redesigned (timeline) |
| `/admin/pii-access` | Personal data access | Org admin | Who saw personal data | Review | Redesigned (sentence rows, needs-review tag) |
| `/admin/export` | Data export | Org admin | Download everything | Download | Redesigned (honest contents list) |
| `/admin/notifications`, `/admin/wizards` | Utilities | Org admin | – | – | Legacy |

## J. Platform

| Route | Page | User | Job | Status |
| --- | --- | --- | --- | --- |
| `/platform/organizations` (+ `/:id`) | Organizations | Operator | Manage tenants | Redesigned (list + profile; invented quota defaults removed) |
| `/platform/master-library` | Master library | Operator | Deploy master content | Header + outdated-deployments band redesigned; tables legacy |
| `/platform/operations` | Operations | Operator | Jobs and queues | Redesigned (failed-jobs band, underline filters) |
| `/platform/users` | Operators / directory | Operator | Platform users | Header + tabs redesigned; tables legacy |
| `/platform/control-center`, `/analytics`, `/audit` | Statistics, audit | Operator | – | Headers aligned (shared header) |
| `/platform/settings`, `/ai-settings`, `/email-*`, `/retention-policies`, `/wizards` | Configuration | Operator | – | Headers aligned (shared header); bodies legacy |

## K / L. Settings and utilities

| Route | Page | Status |
| --- | --- | --- |
| `/search` | Search | Redesigned (editable query, kind filters, compact rows; links fixed) |
| `/notifications` | Inbox | Redesigned (grouped by day, kind filters) |
| `/profile` | My profile | Redesigned (editable vs organization record; writes moved to `features/account`) |
| `/profile/:id` | Colleague profile | Redesigned (contact first; dead messaging link and fake online dot removed) |
| `/admin/settings` | Organization settings | Redesigned (section index, advanced folded) |
| `/settings` | Personal settings | Header + underline tabs redesigned |
| `/select-tenant` | Choose organization | Redesigned |
| `/suspended` | Organization suspended | Tokens applied |
| `/verify/:code` | Public verification | Redesigned (valid / expired / revoked answer first; browser-verified EN + AR, 375px) |
| Auth flows (forgot/reset password, complete invite, change password) | – | Tokens applied; forgot-password button key fixed |
| `/login` | – | Other session |

## Phase 2 – first five pages

1. **Course detail** — the decision page before learning: what, why, for whom, how long, what finishing gives, then one Start/Resume action.
2. **Article reader** — editorial reading with a trust band (owner, version, effective date, review status, scope) and acknowledgement as the page's conclusion.
3. **Review queue** — operational triage: oldest and blocking first, owner and age visible, approve / request changes inline.
4. **My certificates** — proof: valid, expiring, expired; verification code and download as the actions.
5. **Team progress** — departments compared by overdue risk, drilling into the risk queue.

## Shared header

`src/components/layout/PageHeader` (legacy) now renders the same language as
`WorkspaceHeader`: workspace eyebrow taken from the URL, title, wrapping
context line, actions at the end. Every page not yet rebuilt still reads as
part of one product. `WorkspaceHeader` context now wraps instead of truncating.

## Token pass (bodies)

Every remaining legacy page body was moved from hard-coded palette classes
(`hotel-*`, `indigo-*`, `amber-*`, gradients, hex values) to design tokens by
a codemod (~2,000 classes across 41 files): semantic families map to
warning / success / danger / accent, neutrals to ink / muted / border, `dark:`
variants of mapped colours are dropped (tokens are theme-aware), and filled
buttons with white text become the ink primary. Excluded on purpose: the
certificate artwork in `TrainingCertificates` (brand foil/navy colours must
not change or flip in dark mode) and the other session's player/builder files.

Quiz builder, question editor / review / generator, report builder, manual
certificate issue and quiz assignments now use the shared header with a back
link.

## Layout pass

- **People roster**: one filter bar (role underline tabs, status chips shown
  only when non-empty, search) and one dense divided list; row opens the
  drawer, duplicate "Inspect" button removed; status shown only when not active.
- **Hotels (property details)**: dark header band and nested bordered rows
  replaced by a filter bar and a divided list.
- **Bulk import**: numbered steps (add rows, check, import, result);
  pacing/retry settings folded under Advanced. Fixed: organizations without a
  seat limit were capped at 100 by an invented default, which blocked imports.
- **Email delivery / inbound / templates** (platform): figures strip, sections
  instead of cards, underline tabs, labelled "New" button, native
  `window.confirm` replaced by `ConfirmDialog`; stray back links to `/admin`
  removed.
- **AI course generation** (platform): single header with actions, figures
  strip, scrollable underline tabs, factual preset labels (no "Forbes 5-Star"
  or "Vision 2030" badges). Tab bodies unchanged.
- **Article author**: plain tab names (no emoji), editor without card chrome,
  master-article banner informational (not warning-coloured), local notes as a
  quiet section, inspector sticky on desktop.

## Not in this phase

Course builder and player (other session).
