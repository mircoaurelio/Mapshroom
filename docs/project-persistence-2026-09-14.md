# Local project autosave repair — 2026-09-14

Opening a bundled project previously left the editor on a read-only template ID.
Edits were visible in memory, but autosave skipped that ID and reopening restored
the template, dropping references to uploaded photos. Browser fallback saves could
also reopen an older IndexedDB document. A project-size heuristic blocked legitimate
timeline reductions and disabled subsequent autosaves for the session.

## Resulting behavior

- `openEditableProject` resolves each template to a stable `editable:<template ID>`
  personal project. It resumes the existing document when available. The original
  template remains immutable. Its library card is replaced by the user's project
  card, so reopening it continues the user's work. Duplicate creates an independent ID.
- The autosave coordinator coalesces edits for 350 ms, with a maximum scheduling
  delay of 1.5 seconds during continuous interaction. Writes run in order and keep
  the latest pending state for each project. Failed writes retry after two seconds.
- Project navigation waits for pending saves and stays on the current workspace
  when saving fails. Pending slider values are included when flushing. Visibility
  changes and page hide flush saves and attempt a synchronous recovery checkpoint.
  Closing warns only while work is pending, not merely because no JSON was exported.
- Both storage replicas use a monotonic save stamp. Loading selects the newer
  stamped document; the old size heuristic remains only for legacy unstamped
  recovery copies. Loads no longer perform asynchronous migration writes that could
  overwrite concurrent edits. In-tab writes are serialized; Web Locks serialize
  writes across tabs where supported. A newer checkpoint is not replaced by an older
  queued write. This is not collaborative merging of simultaneous edits.
- Intentional timeline reductions save normally. Failure does not silently trim
  shader history or disable future autosaves. Aborted/blocked database operations
  can fall back or report failure instead of leaving writes waiting indefinitely.
- Project data uses IndexedDB; uploaded image bytes continue to be written once
  to the existing asset store. Subsequent edits save references, not another copy
  of every image. Existing project and asset stores retain their schema and keys.
- Desktop and mobile show Saving / Saved locally / Not saved. A visible error
  offers retry. Projects, Rename and Duplicate replace the confusing browser-pin
  flow. JSON export is explicitly labeled as excluding uploaded media; it has not
  been converted into a portable archive in this change.

## Validation

- `npm test`: 169 tests passed, including new coordinator tests for continuous edits,
  navigation, edits during writes, automatic retry, and persistence tests for edited
  templates with uploaded blobs, newest fallback selection, checkpoints, concurrent
  queued writes, legitimate reductions and recovery after both stores fail.
- `npm run build`: passed. Existing large-chunk warnings remain.
- Targeted ESLint: zero errors; existing React hook warnings in the workspace and
  project dialog remain. `git diff --check`: passed.
- Browser test on a separate local development origin: open Statue, rename it,
  upload a valid PNG, reload, verify the personal project and decoded image remain;
  create an empty project and reopen the edited Statue, verifying its media remain.
  An initial deliberately small PNG fixture failed decoding; the successful media
  round trip used the application's valid icon PNG, copied to a test filename.

## Delivery and limits

Implemented and verified in the local checkout. No production deployment in this
task. Pre-existing edits in the checkout were preserved. Temporary test output is
under `tmp/persistence-audit`.

Local saving is scoped to this site's browser profile/device. Deleting site data
still removes local projects and media; browser eviction and abrupt process/device
termination cannot be universally prevented. The change does not recover edits
that the old version never persisted, or package uploaded files inside JSON export.

## Push integration verification

The selected performance and persistence integration passed 164 tests, production build and shader catalog checks. Targeted lint reported zero errors. On a separate localhost production preview, renaming a project, waiting for Saved locally, reloading and reopening Projects retained its name. The performance diagnostic also survived the reload. Unrelated pending asset-library and mapping changes are excluded.
