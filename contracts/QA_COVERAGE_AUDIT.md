# Test coverage audit — 2026-10-23

> Historical baseline before the approved QA implementation. See [Testing and coverage](TESTING.md) for the current tooling and [verification results](QA_VERIFICATION_RESULTS.md) for measured outcomes.

The previous passing suites do not establish complete logic coverage or full responsive compatibility.

## Verified test evidence

- Latest completed backend run: 51 tests passed, including 8 PostgreSQL/MockMvc integration tests. The total also includes architecture and mapper tests; it is not a count of business-logic unit tests alone.
- All 8 current backend `*UseCase` classes have corresponding unit-test classes. `JobEnrichment` also has tests. This establishes class-level test presence, not coverage of every method, branch, or failure mode.
- Latest completed frontend run: 41 tests across 12 files. These run through Angular/Vitest with JSDOM; they cannot establish rendered layout or responsive CSS correctness.
- No measured line/branch coverage report was produced. The repository has no configured JaCoCo coverage gate or browser E2E viewport suite.
- Existing unit-test gaps include several candidate workspace operations, direct exhaustive transition-rule cases, frontend authentication forms/guards, profile form behavior and many dashboard/settings screens. Some related behavior is exercised by integration tests; that does not mean every branch is covered.

## Browser spot check in this audit

Used the local Angular development app in the in-app browser. The backend was not running, so this was a layout spot check, not an authenticated/data-backed end-to-end run. An existing employer session was restored locally; it was not reauthenticated. Viewport overrides were reset afterward.

| Page | Viewport | Document client width | Scroll width | Finding |
| --- | --- | --- | --- | --- |
| Home | 320 × 568 | 305 | 320 | **15 px horizontal overflow** |
| Home | 768 × 1024 | 768 | 768 | No document horizontal overflow observed |
| Home | 1440 × 900 | 1440 | 1440 | No document horizontal overflow observed |
| Home | 844 × 390 | 829 | 829 | No document horizontal overflow observed; vertical scrolling required |
| Login | 390 × 844 | 375 | 375 | No document horizontal overflow observed |

The narrow-home overflow is consistent with `frontend/src/styles.css` setting `body { min-width: 320px; }` while a non-overlay scrollbar reduces the document client width to 305 px. It remains unfixed in this read-only audit. Below `md`, the navbar also hides the main navigation links without an equivalent mobile menu; a complete mobile navigation review remains needed.

No assertion is made for untested pages, authenticated data states, other browsers, browser zoom, on-screen keyboards, real devices, or arbitrary width/height combinations. “No horizontal overflow” is only one layout check, not a complete usability verdict.

## Remaining verification work

1. Measure coverage and add meaningful tests for untested logic branches and failure paths.
2. Correct the confirmed narrow-layout overflow and review mobile navigation.
3. Exercise public, candidate, employer and admin routes with real test data across phone, tablet, desktop and short-landscape viewports; include widths immediately around CSS breakpoints.
4. Check scrolling, keyboard focus, forms, tables, long text, loading/empty/error states and browser zoom.
5. Add a repeatable browser E2E suite if approved; no new test framework was installed during this audit.
