# Prime Connect frontend transformation strategy

Status: assessment complete. This is an analysis and decision baseline, not feature implementation.

## Executive decision

Prime Connect should be a calm, evidence-led hospitality learning platform: assign -> learn -> assess -> certify -> prove compliance, with trusted knowledge search alongside it. It must not become a general hotel intranet, operations console, or collection of dashboards.

The five-workspace navigation is the right product foundation. The immediate problem is that it is implemented beside a legacy product and visual system. Do not start another reskin. Finish one coherent system, workflow by workflow.

## Audit evidence

| Area | Current evidence | Assessment |
| --- | --- | --- |
| Information architecture | Five canonical workspaces exist: Learn, Studio, Manage, Organization, Platform. Account-aware routing sends users to the appropriate workspace and /dashboard redirects. | Retain. This is clearer than a flat navigation model. |
| Learner home | Learn home prioritizes live required work, resume, due soon, saved knowledge, and certificates with live query states. | Best reference page. Preserve its action-first hierarchy. |
| System adoption | 4 of 124 pages use the new src/ui system; 119 still use legacy src/components/ui. Source scans found about 10 new-system imports and 289 legacy-system imports. | The design system is specified but not adopted. |
| Visual consistency | The source has about 992 hotel token references, 228 ds references, 289 pc references, and 1,179 hard-coded hex references. | Three competing visual languages create inconsistent quality and make accessibility QA expensive. |
| Architecture | 54 route page files directly import Supabase; 181 source files do so overall. Major workflows also combine queries, commands, view state, and presentation. | Migrate to feature APIs and hooks before wide visual work. |
| Component boundaries | Knowledge Read and Training Player are about 134 KB each; Quiz about 120 KB; Knowledge Author 117 KB; Training Hub 94 KB. Supporting components reach 75-113 KB. | These are workflows compressed into components, not reusable product surfaces. |
| Search | Global search sends five separate direct table searches over selected fields, limits each to 20, and has no recent searches, suggestions, rank explanation, or source-aware result model. | Useful starting point, not an operational knowledge-search capability. |
| Quality gates | npm run typecheck and npm run check:guardrails both pass in the assessed worktree. | Good code-quality baseline; this is not visual, device, accessibility, or build verification. |

The requested Altus Gulf URL was not accessible from this environment. It has been used only as a stated mood reference; no site pattern has been copied.

## What remains, what changes

### Keep

- Five workspace model, canonical route ownership, account-aware entry, capability-led navigation and platform identity boundary.
- The action order in Learner Home: Required now, Resume, Due soon, Saved knowledge, Certificates.
- Immersive full-bleed course and quiz routes.
- React Query, lazy routes, route error boundaries, existing i18n, RTL foundation, skip link, focus styles, reduced-motion rules, and 44 px touch targets in new primitives.

### Change immediately

| Priority | Problem | Required change |
| --- | --- | --- |
| P0 | Legacy and new visual systems coexist. | Declare src/ui the only future system; freeze new legacy primitive/token imports; migrate complete workflows rather than individual cards. |
| P0 | Pages directly own Supabase calls and workflow logic. | Page composes; feature hook owns query/mutation; feature API owns Supabase. No new page/component client imports. |
| P0 | Course, Article, Hotel, Quiz vocabulary coexists with module, document, property, training module, assessment. Learner resume logic still checks a module content type. | Finish vocabulary migration at model, API, UI, tests, and analytics contracts. Treat every legacy name as explicit compatibility code with removal criteria. |
| P1 | Only Learner Home is a true role-specific action home. | Create action queues for Author, Knowledge Manager, Training Manager, Organization Admin, and Operator. |
| P1 | Studio combines course library, builder, review, assignment handoff, analytics, templates, AI, and bulk actions. | Split into Content work home, staged builder, review queue, and contextual handoffs to Manage. |
| P1 | Knowledge is a filtered library rather than a trusted answer experience. | Build search-led, version-aware Article discovery and reader. |
| P1 | Notifications include maintenance/intranet concepts and generic metric cards. | Separate Action required, Information, History; remove retired product categories. |
| P1 | Manage starts with broad analytics. A dynamic Tailwind color class can be absent from generated production CSS. | Start with an actionable risk queue; use static variant maps for all style variants. |
| P2 | Generic floating AI is broad while valuable contexts are narrow. | Use contextual, sourced AI entry points in Studio, Knowledge, and Manage. |
| P2 | RTL/localization foundations are not enforced page by page. | Replace physical-direction styling, remove English fallbacks, test Arabic content and direction rules manually. |
| P2 | Tables are local implementations. | Establish a behaviorally complete DataTable with server paging, filtering, selection, actions, and a mobile row-card mode. |

## Product principles

1. Action before overview.
2. One job, one workspace home, one canonical URL.
3. Trust is visible: owner, scope, effective date, version, review status, source.
4. Hospitality context is useful: organization -> brand -> hotel -> department -> role.
5. Progress is continuous: resume point, save state, completion rule, next action.
6. Progressive disclosure over dashboard density.
7. Correct, governed paths are easiest.
8. Calm precision, not ornamental luxury.

## Information architecture

| Workspace | Home question | Visible navigation | Contextual work only |
| --- | --- | --- | --- |
| Learn | What must I complete or resume now? | My day, My learning, Explore courses, Paths, Knowledge, My certificates | Course detail/player, quiz, article reader, attachments |
| Studio | What is ready to create, repair, submit, or review? | My content, Review queue, Quizzes, Media | Course/article/question editors and contextual AI |
| Manage | Where are we failing compliance and what should happen now? | Risk queue, Assignments, Course tracking, Team, Certificates, Evidence | Rules, report builder, manual issue |
| Organization | What people or setup action is blocked? | Overview, People, Hotels and departments, Settings, Audit | Invitations, bulk import, export, PII records |
| Platform | Which fleet exception needs intervention? | Exceptions, Organizations, Master library, Operations, Operators, Settings | Audits, email administration, retention |

Do not add a Dashboard or Analytics workspace. Analytics belongs beside the decision it enables. Documents should be attachments of Courses and Articles, not a top-level destination. Keep account utilities in the application chrome, not in workspace navigation.

### Role homes

| User | First information | Primary action |
| --- | --- | --- |
| Learner | Required work -> Resume -> Due soon -> saved operational knowledge | Start or resume the highest-priority assignment |
| Author | Continue draft -> source/import status -> readiness blockers -> review feedback | Create from source or continue draft |
| Knowledge Manager | Review queue -> articles due for review -> changed/retired content -> search gaps | Review or publish a trusted Article |
| Training Manager | Risk queue -> hotel/department trend -> overdue cohorts -> evidence | Open cohort, assign, remind, or export |
| Organization Admin | Setup blockers -> pending invites -> unplaced people -> department ownership | Invite or correctly place a person |
| Platform Operator | Critical exceptions -> onboarding -> failed jobs/deployments -> audit events | Resolve exception or enter an organization under audit |

## Design direction

| Direction | Strength | Risk | Use |
| --- | --- | --- | --- |
| Editorial Hospitality | Human, premium, memorable. | Can obscure urgency, increase bandwidth, and become theatrical. | Login, certificate verification, reader, onboarding, selected empty states. |
| Premium Enterprise | Precise, calm, data-literate, scalable. | Can feel generic without warmth. | Manage, Organization, Platform, Studio, evidence work. |
| Modern Hospitality Technology | Contemporary and approachable. | Can become bento-card sprawl, novelty motion, decorative AI. | Player and selected guided authoring interactions. |

Choose Premium Enterprise as the base and add restrained editorial hospitality only to learning, reading, and meaningful outcomes. Use ink/navy structure, paper/sand surfaces, brass as a focused signal, real operational imagery only where it adds context, and high-quality typography. Do not use photography, charts, cards, or motion as decoration.

## Design system

src/ui becomes the sole future component system. Do not add another MUI, bespoke, or page-specific language. Retire duplicates incrementally, with visual and behavioral tests.

| Token | Standard |
| --- | --- |
| Color | Existing ds ink, paper, surface, brass, and semantic colors. Brass denotes priority/selection; semantic colors denote status. No local hex values. |
| Typography | DM Sans for Latin UI/body, IBM Plex Sans Arabic for Arabic UI/body, Cormorant Garamond only for rare editorial display moments. |
| Spacing | 4 px base: 4, 8, 12, 16, 24, 32, 48, 64. |
| Shape | Controls 6 px; standard cards/dialogs 8 px; feature panels 12 px. |
| Elevation | Borders by default. Shadow only for an elevation boundary such as menu, sheet, or dialog. |
| Breakpoints | 360, 390, 640, 768, 1024, 1280, 1440. |
| Motion | Press 120-160 ms; menu 150-200 ms; dialog/sheet 200-260 ms; opacity/transform only; reduced motion removes spatial movement. |
| Iconography | Lucide at semantic 16/20/24 sizes. Directional arrows mirror; media controls, codes and chart axes do not. |

Canonical components must own their behavioral states: form errors and submission, Query loading/empty/error/permission, table sort/filter/page/select/bulk actions, search keyboard navigation/results/no-results, command-aware Toast feedback, and accessible dialogs/sheets. Course and Article cards must expose status, scope, time, owner/version where relevant, and one clear next action.

## Page architecture

| Page or flow | Current issue | Future layout and primary action |
| --- | --- | --- |
| Learn home | Strong hierarchy but legacy module data term remains. | Required queue; Resume; Due soon; compact saved Articles/Certificates. Start/Resume is dominant. |
| My learning | Can become an undifferentiated inventory. | Required, In progress, Completed views; saved filters; one Resume per row. |
| Explore courses/detail | Direct page query/enrollment logic; optional browsing can distract from assigned work. | Search first; role/hotel relevance, duration, level, availability; detail makes audience, effort, outcomes and assignment state clear. |
| Course player/quiz | Very large page state/data implementation. | Persistent progress/outline; one current lesson; stable next action; contextual approved Articles; explicit quiz rules/results. |
| Knowledge Browse | Client-heavy filtering and library grid hide relevance/freshness. | Search-led answer list with Article type, scope, trusted status and effective date. |
| Article reader | Large mixed reader/resource responsibility. | Type, owner, version, effective date, sticky contents, related learning, acknowledgement only when required. |
| Knowledge Author/Review | AI, upload, access, metadata and lifecycle crowd the experience. | Source -> draft -> classify/scope -> readiness -> submit; reviewer compares change with source and decision. |
| Studio | Library, builder, governance, assignments, analytics compete. | Continue drafts; review feedback; source import; staged builder. Create from source is primary. |
| Manage compliance | Metrics/charts come before responsibility. | Risk queue by hotel/department/course -> cohort -> action -> evidence. |
| Assignments/tracking/team | One manager job is fragmented across pages. | Audience -> content -> schedule/rules -> review. Tracking owns course drill-down; Team owns accountable cohort. |
| Evidence/certificates | Evidence can be lost among analytics. | Exports, issued/expiring certificates, audit-ready package; explicit authorized actions. |
| Organization | CRUD patterns hide setup blockers. | Setup blockers, invitations, unplaced people, department owners, audit events. |
| Platform | Tenant and operator concerns can blur. | Fleet exceptions, onboarding, failed deployment/jobs, controlled audited tenant entry. |
| Search/notifications | Field search and metric-heavy inbox. | Command search for navigation; result search for deep work. Notifications: Action required, Information, History. |

## Core workflow targets

Current click counts have not been invented. Capture them with representative users before migration. These are acceptance targets.

| Workflow | Future flow | Target |
| --- | --- | --- |
| Login | Sign in -> account-aware workspace -> valid authorized deep link. | No lost valid deep link. |
| First use | Invitation -> completion -> one contextual first action. | One dismissible/resumable prompt, not a tour. |
| Start/resume course | Assignment -> saved lesson -> persistent save -> next action. | Assigned course starts from one visible CTA; resume restores last valid lesson. |
| Complete/quiz | Required content -> clear completion -> quiz rules -> submit -> result/next action. | Pass, fail, retry and next action are unambiguous. |
| Find SOP | Query -> ranked trusted Article -> source/version-aware reader. | Common task opens trusted answer with no more than one refinement. |
| Create with AI | Select source -> Draft generation with cited segments -> edit -> readiness -> review. | No generated content silently becomes authoritative. |
| Publish | Queue -> source/change evidence -> approve/request change/retire -> versioned publish. | Reviewer has required evidence in the same flow. |
| Assign | Audience -> content -> schedule/rule -> impact preview -> confirm. | Three intentional steps; audit/link after server success. |
| Monitor compliance | Risk queue -> cohort -> learner action -> evidence. | Scoped manager identifies highest-risk cohort in under 10 seconds. |
| Invite | Invite -> capability -> hotel/department placement -> preview -> send. | Every invitation has valid organization scope before send. |
| Operator intervention | Exception -> resolve/deploy -> audited organization entry when needed -> exit. | Tenant entry always records purpose and audit event. |

## Mobile, Arabic, and accessibility

At 1440/1280 use a persistent workspace sidebar and full manager controls. At 1024 compact navigation and move filters into a bar or sheet. At 768 convert action-oriented tables into record cards; preserve horizontal scrolling only for genuine evidence tables with pinned identifier/action columns. At 640/390/360 expose one primary action per section, use filter sheets, stack metadata, retain 44 px targets, and use a sticky player action bar.

Use logical CSS as the default. Mirror navigation, breadcrumbs, drawers, progress direction and directional arrows. Do not mirror play/pause, checkmarks, IDs, codes, dates, media timelines, numeric chart axes, or code. Test mixed Arabic/Latin titles, wrapping, type weights and number treatment on real content.

WCAG AA is a release condition: keyboard traversal and focus return, semantic landmarks/headings, labels/descriptions, live error/save/status feedback, 44 px targets, captions/transcripts, chart text equivalents, contrast in light/dark/Arabic modes, and respectful reduced motion.

## Performance

- Set route performance budgets and test on a mid-range Android device and constrained network.
- Split Player, Reader, Authoring, Studio, AI, media, and charts at point of use.
- Move all new data work to feature APIs/hooks with query key, scope, stale time, retry and invalidation ownership.
- Use server paging/filtering and virtualization for long people, Article, assignment and audit lists.
- Use layout-stable skeletons for content, small inline pending states for commands, and clear background-job state for export, AI, ingestion, deployment.
- Size and optimize images; never require decorative media to understand a lesson or SOP.

## AI

AI is contextual assistance, not a permanent destination.

| Context | Useful behavior | Trust rule |
| --- | --- | --- |
| Course creation | Outline, objectives, lesson/quiz candidates from selected source. | Cite source, label Draft, require author/reviewer approval. |
| Article authoring | Summarize, classify, tag, flag missing steps/readability. | Preserve original source and review status. |
| Knowledge reading | Answer using the selected approved Article set. | Link exact Article/version; say not found rather than inventing policy. |
| Compliance | Explain a selected risk cohort and draft safe follow-up. | Show inputs; manager confirms any action. |
| Platform | Summarize failed work and draft operator checklist. | Never alter tenant/configuration without explicit audited action. |

Replace the broad floating Copilot with contextual entry points: Draft from source in Studio, Ask approved Articles in Knowledge, Explain this risk in Manage. Retain a global utility only after scoped experiences establish trust.

## Future architecture

    src/
      app/                  shell, providers, router
      features/
        learn/              api, hooks, model, components, pages
        studio/
        knowledge/
        assignments/
        certificates/
        org/
        platform/
      ui/                   tokens and generic, business-free components
      lib/                  client/framework utilities only

Pages compose. Feature APIs own Supabase. Feature hooks own React Query. Context is only session, active organization/workspace, and truly global UI settings. Governed writes use server commands and show success only after server confirmation. Preserve capability gates, organization/hotel context, canonical URLs and RLS as migration boundaries.

## Roadmap

| Phase | Outcome |
| --- | --- |
| 0 | Ratify vocabulary, UI ownership, route ownership, review checklist, baseline task instrumentation. |
| 1 | Tokens, typography, contrast and Arabic type contract. |
| 2 | Behavioral primitives: forms, queues, tables, search, feedback, states. |
| 3 | Application shell: workspace switcher, context, utilities, mobile chrome. |
| 4 | Learner end-to-end: My day, My learning, catalog, player, quiz, certificate. |
| 5 | Trusted knowledge search, browse, reader and Article lifecycle handoff. |
| 6 | Studio author/reviewer homes, staged creation, contextual AI. |
| 7 | Manage risk queue, assignments, tracking, teams, evidence. |
| 8 | Organization health, people, hotel/department setup and audit. |
| 9 | Platform exception and controlled master-content workflows. |
| 10 | Device and Arabic/RTL task QA. |
| 11 | Accessibility/performance release gates. |
| 12 | Instrumented usability pilot and debt closeout. |

## Deliberate non-changes

Do not reintroduce universal dashboards, marketing pages, hotel operations modules, gamification, motivational widgets, ILT UI, competency-framework UI, a second wholesale UI-library migration, or a generic authoritative chatbot. Do not add navigation for every action. Do not relax capability or RLS boundaries to shorten a client flow.

## Definition of success

Altus Connect is the dependable place where a hospitality group can make learning operational and provable. A learner immediately knows what matters today. A manager sees the few risks that demand action and can prove the result. An author turns approved source into reviewed learning without losing context. A knowledge manager publishes answers people can find and trust. An operator supports organizations without blurring tenant boundaries.

The premium quality comes from restraint, continuity, governance and speed: fewer destinations, fewer colors, fewer decorative cards and fewer ambiguous actions, with every remaining element helping a hospitality organization learn, comply and operate confidently.

