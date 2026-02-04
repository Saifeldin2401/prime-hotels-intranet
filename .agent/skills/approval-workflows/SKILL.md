---
name: Approval Workflows
description: Guidelines for implementing approval and escalation workflows
---

# Approval Workflows Skill

## Overview
Multi-step approval system for leave, documents, and other requests.

## Database Tables
- `workflow_requests` - Request tracking
- `workflow_steps` - Step definitions
- `approval_requests` - Pending approvals
- `temporary_approvers` - Delegation
- `escalation_rules` - Auto-escalation

## Components
Located in `src/components/approvals/`:
- `ApprovalWorkflow.tsx` - Workflow display
- `DelegateApprovalDialog.tsx` - Delegation UI

Located in `src/components/workflow/`:
- `WorkflowTimeline.tsx` - Step timeline

## Hooks
- `useApprovalAuthority` - Permission checks
- `useApprovalStats` - Queue statistics
- `useWorkflows` - Workflow management
- `useEscalation` - Escalation handling

## Workflow Types
- Leave requests
- Document approvals
- Training assignments
- Job postings
- Promotions/transfers

## Usage
```typescript
import { useWorkflows } from '@/hooks/useWorkflows';

const { 
  pendingApprovals, 
  approve, 
  reject,
  escalate 
} = useWorkflows();

// Approve request
await approve(requestId, { feedback: 'Approved' });

// Reject with reason
await reject(requestId, { 
  reason: 'Budget constraints' 
});
```

## Escalation
Auto-escalation via Edge Function:
`supabase/functions/approval-escalation/`

Triggers after configured hours of inactivity.

## Translations
Namespace: `approvals`

## RLS Consideration
Approvers can only see requests assigned to them.
