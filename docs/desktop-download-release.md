# Windows download and release checks

The website distributes the Windows x64 beta through email verification and the
private `mapshroom-desktop-beta` R2 bucket. GitHub desktop workflow artifacts are
build outputs, not public installer links. There is no macOS or Linux installer.

## September 2026 repair

- Production builds no longer depend on an untracked `.env` for the public
  Turnstile widget identifier. The server secret remains in Worker secrets.
- Resending email obtains a new human-verification token.
- A verified session can download again after refreshing or returning to the
  download page. Every button click obtains a fresh download grant.
- Installer requests support HEAD, Content-Length, byte ranges and retries.
  Grants retain their existing ten-minute expiry and can be reused until then.
  Missing files do not mark a download as started.
- Windows 3.0.2 includes the latest workspace changes. The main WebView allows
  HTML drag and drop. This beta remains unsigned; the download page says so.
- Desktop CI now runs for frontend/assets/tests changes as well as native code.
  React Compiler diagnostics remain visible as warnings because this project
  does not enable that compiler. Hook correctness and TypeScript checks remain.

## Publish in order

1. Keep the application version aligned in package manifests, Tauri/Cargo,
   Windows packaging, and the growth Worker's `DESKTOP_OBJECT_KEY`.
2. Run `npm test`, `npm run lint`, `npm run check:secrets`,
   `npm run check:shaders`, and `npm run tauri:build`.
3. Run `npm run release:checksums`. Upload the versioned NSIS installer to the
   private bucket with `wrangler r2 object put ... --remote --file ...`.
   Do not replace an older version's object with different bytes.
4. Verify the uploaded file hash, then run `npm run growth:deploy`. The growth
   API is a separate Worker; the website's GitHub deployment does not deploy it.
5. Push the validated source to GitHub main and verify the desktop workflow and
   both website deployments (GitHub Pages and Cloudflare Workers Builds).
6. Check the live widget, verification recovery, HEAD, repeated range requests,
   and a full installer download against SHA256SUMS. Use an isolated QA record
   without sending email, and delete that record after verification.

Installing or launching a build is a separate check from downloading it.
Windows SmartScreen reputation and trusted code signing are separate from
successful compilation, checksum verification, and HTTPS availability.
