## 2024-03-22 - Replacing `setTimeout` based debounce with `useDebounce` hook is a code refactor, not a performance optimization
**Learning:** I learned that replacing manual debouncing using `useEffect` and `setTimeout` with the `useDebounce` hook is purely a code refactor for cleaner code. Real performance improvements require finding inputs that are making API calls or expensive calculations without *any* debouncing and wrapping them in `useDebounce`.
**Action:** When looking for performance improvements related to debouncing, I will actively look for inputs that currently lack debouncing entirely before trying to implement it.

## 2024-03-22 - Debouncing search inputs before passing to useQuery
**Learning:** Passing an un-debounced search input state directly to a TanStack `useQuery` dependency array and query function causes unnecessary API calls on every single keystroke. This is a common pattern that degrades performance significantly.
**Action:** Always wrap search input state with `useDebounce` before passing it to `useQuery` hooks to limit the frequency of API calls and reduce database load.
## 2024-03-14 - [Debounce Frontend API Calls]
**Learning:** Certain frontend search fields, like `QuestionSelector`, make a call to an API on every keystroke. This happens if the component is using an API-fetching hook like `useQuestions` and passes the raw `search` string to it instead of debouncing it. It causes excessive database loads during active typing.
**Action:** When working on search-driven components, use the `useDebounce` hook (e.g., `useDebounce(search, 300)`) on the input's state before passing it to network-bound hooks to reduce database load.
