# Green facility design recovery

## Inspection and recovery source

The working tree contained the complete blue redesign when inspected. `base.css` was not its only source: App composed `HolographicWorkstation`, the facility and side monitors had been replaced, and the other three stylesheets contained blue interface rules. No staged changes were present.

Git has one commit, `c9c7b1d` (`new idea`), shared by `main` and `origin/main`. It contains the original green facility implementation shown in the reference. No other branch or reflog version contains a newer project showcase.

The inspection covered `git status --short`, `git diff --stat`, the working and cached diffs, the last ten log entries, source files, original files via `git show`, and the current component tree. Existing Vite on port 5174 was reused.

## Recoverable snapshot

Before editing, all 50 existing tracked and untracked project files were saved in:

`artifacts/recovery-backups/2026-11-04-before-green/`

The initial snapshot was created in `/private/tmp/shaaz-before-green-recovery-r9s12w2s/` before any edit, then copied into the project’s ignored artifacts folder for longer-term recovery.

- `workspace.tar.gz`: source files, configuration, lockfile, and bundled model.
- `manifest.json`: SHA-256 hashes and paths already deleted before recovery.
- `working-tree.patch`, `staged.patch`, `status.txt`, and `history.txt`: original Git state.

The archive can be extracted to a separate directory for comparison or selective file recovery. No repository reset, global restore, clean, or destructive undo was performed.

## What changed

| Area                | Recovery                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App composition     | Reconnected the original physical CRT shell and both side monitors to the current conversation, recognition, and playback hooks.                                                                         |
| `base.css`          | Restored the specified green/charcoal palette, original brand treatment, and compact facility layout. Retained focus visibility, skip-link accessibility, bundled typography, and notification behavior. |
| CRT and environment | Recovered original casing, screws, bezel, glass, stand, server racks, hardware texture, and mechanical key surfaces from `c9c7b1d`.                                                                      |
| Proportions         | Central CRT width is approximately 11% greater than the original 65.5% share. Avatar/content grid is 28% / 70%, with a 2% gap; the avatar canvas scales uniformly to 82%.                                |
| Conversation        | Desktop questions and answers use 16px Space Grotesk with 1.75 line height, distinct styling, internal scrolling, and more usable width.                                                                 |
| Avatar              | Same GLB, geometry, loader, rig, and animation modules. Restored only the prior green-era material colours and lighting values from the original source; resized presentation using CSS.                 |
| Side monitors       | Readable identity details and all seven existing archive topics: Projects, Technical skills, Experience, Education, Leadership, Ambitions, Contact.                                                      |
| Copy                | Removed serial numbers, extra status lines, corner slogans, projection labels, decorative page footer, and keyboard slogans.                                                                             |
| Responsive behavior | Desktop reserves space for the input and full keyboard; tablet and mobile retain both side panels below the primary controls.                                                                            |

## Functional preservation

A SHA-256 comparison against the snapshot confirms 24 protected files remained unchanged, including:

- Both personal-data files and the existing project information.
- All hooks and service modules, including intent matching, follow-up context, speech recognition, speech synthesis, and keyboard editing.
- Avatar GLB and configuration, loader, animation factory, and placeholder animation.
- `package.json` and `package-lock.json`.
- `scripts/verify.mjs` and `scripts/verify-voice.mjs`.

The virtual keyboard component only had decorative labels removed or renamed; key definitions, selection handling, event handlers, press state, and submission wiring are unchanged.

`verify.mjs` was inspected rather than reverted. Its changes from Git support the newer manual playback behavior, voice tests, custom GLB fallback, and accessibility checks. Those checks remain relevant, so the file was left intact. Recovery-specific checks live separately in `scripts/verify-recovery.mjs`.

## Missing showcase implementation

This checkout and its only Git commit do **not** contain project screenshot assets, showcase/lightbox components, per-project GitHub URLs, or Live Demo URLs. The supplied project descriptions, technology lists, conversation archive, follow-up context, and profile contact links are present and preserved. No missing media, project links, or personal information was invented.

These absent showcase features cannot be verified from this copy. A location for any separate implementation was requested during recovery.

## Verification

- `npm test`: existing conversation and native speech adapter tests.
- `npm run build`: production compilation.
- `node scripts/verify.mjs --url=http://127.0.0.1:5174`: unchanged interaction, voice, avatar, and responsive suite.
- `node scripts/verify-recovery.mjs --url=http://127.0.0.1:5174`: viewport fit, CRT enlargement, side-monitor clearance, avatar ratio, green palette, seven archive actions, contact targets, project follow-ups, and 16px conversation typography.

Screenshots and machine-readable reports are in ignored `artifacts/`, including `preservation-report.json`, `recovery-report.json`, and `verification-report.json`. Native speech APIs are mocked in browser tests; actual microphone accuracy and audible voice quality still depend on the browser and device.

### Results

- 14 unit tests passed.
- All 35 existing browser checks passed without changing the verification scripts.
- All 14 additional recovery checks passed, including the four requested desktop sizes and four tablet/mobile sizes.
- Production build succeeded; Vite retains the existing warning about the separately loaded Three.js chunk exceeding 500 kB.
- No browser console errors were recorded.
- The supplied GitHub profile returned HTTP 200. Email/LinkedIn link targets were checked against the preserved contact data. No per-project Live Demo links exist in this checkout.
