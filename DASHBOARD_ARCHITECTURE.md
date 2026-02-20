# PRIME Connect Dashboard Architecture

This document outlines the architectural framework for the PRIME Connect Dashboard, designed for a multi-property hospitality portfolio with strict financial governance and dynamic RBAC-based rendering.

## Core Philosophy: Unified Framework, Dynamic Views

Instead of creating separate dashboards for different roles, PRIME Connect uses a **Single Dashboard Framework** that adapts its behavior based on the user's current context and permissions.

### 1. Hierarchy & RBAC Context
The dashboard behavior is governed by the intersection of three dimensions:
- **RBAC Level**: (Corporate Admin → Regional Admin → Property Manager → Department Head → Staff)
- **Primary Context**: The currently selected view (Group View → Cluster View → Hotel View → My Department)
- **Job Title**: Provides fine-grained functional overrides (e.g., Finance Director vs. HR Manager)

## Visibility Logic & Widget Mapping

### Widget Tiering
| Widget Name | Visibility Level | Access Overrides |
|-------------|------------------|------------------|
| **WelcomeHeader** | Universal | Context-aware greeting & stats |
| **StatsGrid (Core)** | Universal | Data filtered by reach |
| **FinancialPerformance** | Corporate / GM | Requires 'FINANCE_VIEW' permission |
| **PayrollExposure** | Corporate / GM / HR | Restricted to 'PAYROLL_VIEW' |
| **MaintenanceHealth** | Universal | Filtered by location/department |
| **P&L / GOP Summary** | Corporate / GM / D.O.F | Restricted to 'FINANCIAL_SENSITIVE' |
| **ActivityFeed** | Universal | Filtered by team/property |

### Restriction Strategy
- **Restricted KPIs**: Sensitive metrics (GOP, Occupancy Revenue) are only calculated and returned if the user possesses the `sensitive_data_access` flag.
- **Financial Exposure**:
  - **Corporate**: Consolidated P&L across all hotels + individual hotel comparison.
  - **Property**: Hotel-level GOP, department budget adherence.
  - **Staff**: No financial data; focus on operational tasks and training.

## Data Filtering Rules

### Automatic Contextual Filtering
The `useDashboardStats` and related hooks automatically append filter conditions based on the `current_context`:
1. **Property Level**: `supabase.from('tasks').select('*').eq('property_id', current_property_id)`
2. **Department Level**: `...eq('department_id', user_department_id)`
3. **Cluster Level**: Uses `property_id` list derived from the user's cluster assignment.
4. **Corporate**: No property/department filter unless explicitly selected in the context switcher.

### Drill-Down Logic
Drill-down functionality replaces the need for separate dashboards.
- Clicking a **Property** in the Corporate view switches the dashboard `context_id` to that Property, instantly re-filtering all widgets to that hotel's data.

## Examples by Persona

### 1. Corporate CEO
- **View**: Consolidated Portfolio Overview.
- **Key KPIs**: Group ADR, Occupancy, Total Revenue vs. Budget.
- **Restriction**: Full access across all properties.

### 2. Director of Finance (D.O.F)
- **View**: Financial Control Center.
- **Key KPIs**: GOP, P&L, Actuals vs. Forecast.
- **Restriction**: Property-specific financial data.

### 3. General Manager (GM)
- **View**: Property Command Center.
- **Key KPIs**: Guest Satisfaction, Maintenance SLA, Property Revenue.
- **Restriction**: Full access to *one* property; no access to other hotels.

### 4. F&B Manager / Front Office Manager
- **View**: Operational Department View.
- **Key KPIs**: Department Task Completion, Training Compliance, Department Budget.
- **Restriction**: Data filtered strictly to *their* department and property.

## Architecture Implementation

### RBAC Structure
We use a **Permission-Based RBAC** where roles map to specific capabilities:
- `VIEW_FINANCIALS`
- `VIEW_PAYROLL`
- `MANAGE_USERS`
- `VIEW_ALL_PROPERTIES`

### Database Enforcement (RLS)
Security is implemented at the database layer using **Supabase RLS**:
```sql
-- Example: Task Visibility Policy
CREATE POLICY "Users can view tasks in their property" ON tasks
FOR SELECT TO authenticated
USING (
  property_id IN (
    SELECT property_id FROM user_properties WHERE user_id = auth.uid()
  ) OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'corporate_admin')
  )
);
```

## Performance & Security

### Over-fetching Prevention
- Widgets only fetch the data they need.
- Consolidated views use aggregated RPC functions (`get_portfolio_summary`) rather than fetching thousands of individual records.

### Security Standards
- **Financial Data**: Encryption at rest; masked values for unauthorized roles.
- **Caching**: React Query keys include `userId` and `contextId` to prevent cache leakage between roles or contexts.
- **Auditing**: Every access to sensitive PII or Financial reports is logged in the `pii_access_logs` table.
