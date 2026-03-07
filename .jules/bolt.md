## 2026-03-05 - Prevent Excessive API Calls on Search Keystrokes
**Learning:** React Query will fire a new query on every keystroke if the raw search input state is used directly in the queryKey.
**Action:** Use a `useDebounce` hook to wrap the search input state and use the debounced value in the `queryKey` and query function. This drastically reduces unnecessary database requests and improves frontend responsiveness.
