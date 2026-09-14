# Photo-first Asset page

New projects open Asset with an empty library and a photo upload prompt. The entry screen provides a file picker, clipboard paste, drag and drop, an existing-project file action, and three practical photo tips. No demo photo is inserted on creation or restoration. Existing projects retain their saved photos, derived versions and explicitly saved demo media; legacy demo IDs still resolve.

Uploading the first photo enables automatic generation of background removal, color gradient, depth and segmentation versions. The existing worker queue saves each completed image independently, with progress, cancellation and retry available. Saved upload preferences apply to subsequent imports. The existing device limits remain: automatic phone processing skips AI, and unavailable depth generation is indicated on its card. There is no fixed completion-time promise.

Desktop Asset uses a full-width originals grid followed by four generated-version cards. Selecting a version and choosing Use selected version opens it in Workspace. Preview, comparison, download, manual adjustment, renaming, deletion and additional outputs remain available. The source image is preserved. The bottom shader timeline belongs only to Workspace.

Verification covers a new browser origin, empty-library restoration, a real photo import producing all four versions, saved-version restoration without duplicate jobs, switching to Workspace, and a 390 px layout without horizontal overflow. The 222-test suite, secret scan, shader smoke checks and production build passed before publication.
