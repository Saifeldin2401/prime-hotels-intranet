# Bolt's Performance Journal

## 2025-03-03 - [Debounce Search-as-you-type]
**Learning:** In applications using Supabase RPCs for filtering large datasets (like Employee Directory), immediate "search-as-you-type" causes massive overhead. Each keystroke triggers a database transaction and network roundtrip. Centralizing debounce logic not only cleans up the code but significantly reduces server-side load and client-side re-renders.
**Action:** Always check search inputs for debouncing. Prefer a reusable hook over local `useEffect` implementations to maintain consistency in delay timings (e.g., 300-400ms).
