# Debug Hypotheses - Approval Delegation System

## Hypotheses Generated

### Hypothesis A: Delegation mutation receives correct parameters
**Question**: Are `approvalId`, `approvalType`, `delegateId`, and `reason` correctly passed to the mutation?
**Instrumentation**: Logs at `DelegateApprovalDialog.tsx:81`
**Expected**: All parameters should be present when delegation is initiated

### Hypothesis B: Database insert fails or succeeds incorrectly
**Question**: Does the insert operation succeed? Are all fields (including `reason`, `entity_type`, `entity_id`) being saved?
**Instrumentation**: Logs at `DelegateApprovalDialog.tsx:90, 107, 111, 116`
**Expected**: Insert should succeed with all fields populated correctly

### Hypothesis C: Reason field is persisted correctly
**Question**: Is the `reason` field actually saved to the database?
**Instrumentation**: Logs at `DelegateApprovalDialog.tsx:116` (checks `hasReason` in inserted data)
**Expected**: `reason` should be present in the inserted record if provided

### Hypothesis D: Approval RPC function works for delegates
**Question**: Can delegates successfully approve documents using the RPC function?
**Instrumentation**: Logs at `MyApprovals.tsx:259, 264, 272`
**Expected**: RPC should succeed for delegates, but may fail if RLS policies don't check entity_type/entity_id

### Hypothesis E: Pending approvals query returns correct results
**Question**: Are delegates seeing the approvals they should be able to act on?
**Instrumentation**: Logs at `MyApprovals.tsx:65, 92`
**Expected**: Delegates should see approvals they're delegated to, but may not if RLS policies are incomplete

## Critical Issue Identified (Code Analysis)

**RLS Policies Missing entity_type/entity_id Checks**: 
- The RLS policies in `20260206113000_document_approval_atomic_and_rls.sql` and `20260206113100_document_approvals_delegate_select.sql` check `temporary_approvers` but only verify `scope_type`/`scope_id`
- They do NOT check if `entity_type`/`entity_id` match the specific approval being accessed
- This means approval-specific delegations won't work - delegates will either see all approvals (scope-based) or none (if entity_type/entity_id mismatch)

## Next Steps

1. Run the app and test delegation flow
2. Analyze logs to confirm/reject hypotheses
3. Fix RLS policies to check entity_type/entity_id when present
4. Verify fixes with post-fix logs

