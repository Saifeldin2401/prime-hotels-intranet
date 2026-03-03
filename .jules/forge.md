## 2025-05-22 - Automatic Vacation Balance Tracking
**Issue:** Vacation balances were manually managed, leading to inconsistencies and extra overhead for HR. Employees couldn't see their remaining balance when requesting leave.
**Impact:** High risk of over-requesting leave and increased HR manual verification time.
**Resolution:** Implemented a Supabase trigger to automatically calculate used and pending annual leave days in the `user_vacation_balance` table based on `leave_requests`. Enhanced the frontend to show real-time balance to employees and HR.
**Prevention:** Always use database triggers for denormalized balances that depend on transactional status changes.
