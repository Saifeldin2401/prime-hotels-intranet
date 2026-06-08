# LMS Admin Unified Redesign Proposal

## Executive Summary

This proposal unifies Training Modules, Course Builder, and Assignments into a single, connected LMS Admin experience under `/training/hub`. The system delivers a guided lifecycle that moves from design to build, assign, track, and improve without switching sections or losing context. The workflow is menu-driven and choice-based, reduces manual typing, and supports non-technical administrators with smart defaults, templates, and guided wizards.

The implementation replaces fragmented pages with a single Training Hub that integrates module library, builder, assignments, and insights. Legacy routes are preserved via redirects for backward compatibility.

## 1. Unified LMS Workflow Diagram

```
[Design] -> [Build] -> [Configure] -> [Assign] -> [Track] -> [Improve]
    |          |          |            |          |          |
    |----------|----------|------------|----------|----------|
                     (continuous loop)

Design: Module library, filters, templates
Build:  Course Builder with blocks and previews
Configure: Settings, rules, versions, certificates
Assign: Target users, roles, properties, schedules
Track: Dashboards, completion, feedback
Improve: Iterations, cloning, version updates
```

## 2. Redesigned Navigation Structure

Global navigation:
1. Learning
2. Learning Management
3. Question Bank

Learning Management group:
1. LMS Admin (single entry point) -> `/training/hub`

LMS Admin internal navigation (contextual):
1. Design (Module Library)
2. Build (Course Builder)
3. Assign (Assignments)
4. Track (Insights)

## 3. UX Wireframes (Key Screens)

LMS Admin Hub (Design / Library)
```
+--------------------------------------------------------------+
| LMS Admin | [Track] [Wizard] [Template] [Create Module]       |
+--------------------------------------------------------------+
| Stepper: Design | Build | Assign | Track                      |
+--------------------------------------------------------------+
| Filters: Search | Category | Status | Sort                    |
+--------------------------------------------------------------+
| Module Cards (Status, Assigned Badge, Difficulty, Category)   |
| [Edit] [Assign] [Clone] [View] [Delete]                       |
+--------------------------------------------------------------+
```

Course Builder (Build)
```
+--------------------------------------------------------------+
| LMS Admin | [Library] [Assign]                                |
+--------------------------------------------------------------+
| Builder Workspace:                                            |
| - Left: Content Block Palette (Video, Quiz, Policy, SOP)      |
| - Center: Drag-and-Drop Canvas                                |
| - Right: Settings, Skills, Metadata                           |
+--------------------------------------------------------------+
| Preview Drawer / Live Preview                                 |
+--------------------------------------------------------------+
```

Assignments (Assign)
```
+--------------------------------------------------------------+
| LMS Admin | [Assignment Rules] [Create Assignment]            |
+--------------------------------------------------------------+
| Tabs: Overview | Assignments                                  |
| - Role / Property / Department targeting                      |
| - Bulk assign                                                  |
| - Due dates, reminders                                         |
+--------------------------------------------------------------+
```

Insights (Track)
```
+--------------------------------------------------------------+
| LMS Admin | [Manage Assignments]                              |
+--------------------------------------------------------------+
| Metrics: Total | Published | Draft | Completed | In Progress   |
| Assignment Activity + Completion Trends                       |
+--------------------------------------------------------------+
```

## 4. Component Design Standards

Layout and structure:
1. Single-page hub with view modes (Design, Build, Assign, Track)
2. Consistent header with action buttons and contextual tools
3. Stepper for lifecycle navigation

UI components:
1. Module Card: status badge, assigned badge, difficulty chip
2. Quick Actions: edit, assign, clone, view, delete
3. Wizards: multi-step creation with progress and validation
4. Templates: selector with previews and filters
5. Assignments Panel: role/property targeting and bulk actions

Interaction rules:
1. Choice-based input preferred over manual typing
2. Smart defaults for category, duration, difficulty
3. Inline guidance and helper text
4. Real-time preview for builder

## 5. Technical Implementation Plan

Phase 1: Core unification
1. Add `/training/hub` as single LMS Admin entry
2. Redirect legacy routes to hub
3. Add internal view routing: list, builder, assignments, insights

Phase 2: Builder integration
1. Embed existing builder within hub
2. Normalize module ID handling to avoid invalid queries
3. Maintain compatibility with existing training modules data

Phase 3: Assignment integration
1. Refactor assignments to reusable panel
2. Enable module-to-assignment deep links
3. Add insights view built on assignments data

Phase 4: UX enhancements
1. Stepper-based navigation
2. Wizard and template creation flows
3. Unified actions and contextual menus

## 6. Migration Roadmap

1. Redirect legacy routes:
   - `/training/modules` -> `/training/hub?view=list`
   - `/training/builder` -> `/training/hub?view=builder`
   - `/training/assignments` -> `/training/hub?view=assignments`
2. Preserve existing data tables and APIs
3. Incrementally roll out to admin roles
4. Track usage and iterate on UX feedback

## 7. Risk Assessment

1. Role-based access drift
   - Risk: staff see admin tooling
   - Mitigation: explicit role gating on each hub view

2. Legacy deep links
   - Risk: broken routes from bookmarks
   - Mitigation: redirects and alias handling

3. Module creation conflicts
   - Risk: incomplete drafts and orphan data
   - Mitigation: wizard validation and safe draft creation

4. Assignment overload
   - Risk: excessive notifications
   - Mitigation: configurable rules and reminder cadence

## 8. Executive Summary (Condensed)

The unified LMS Admin Hub provides a single, connected workflow for training design, building, assignment, and tracking. It eliminates fragmentation, reduces administrative effort, and supports scalable training operations with a consistent, guided UX. The implementation preserves backward compatibility, integrates existing data, and aligns with enterprise LMS expectations.

## Implementation Notes (Aligned With Code)

1. Single hub route: `/training/hub` with view modes (list, builder, assignments, insights)
2. Integrated assignments via `TrainingAssignmentsPanel`
3. Role-based access controls across view modes
4. Legacy route redirects for seamless migration

