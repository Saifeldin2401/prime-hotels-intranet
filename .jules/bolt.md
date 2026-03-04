## 2024-05-20 - Adding debouncing to search component
**Learning:** Found multiple search components updating state on every keystroke (`EmployeeDirectory.tsx`, `GlobalSearch.tsx`, `SubmitTicket.tsx`). This causes excessive re-renders and potential performance issues, especially when search is connected to Tanstack Query or complex filtering.
**Action:** Standardize debounce behavior by creating a generic `useDebounce` hook. Use it for text inputs that trigger filtering or data fetching.
