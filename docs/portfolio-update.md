# Portfolio update — 5 November 2026

The existing green facility, CRT casing, identity and archive monitors, avatar, and keyboard are retained. This update adds the requested project content and recruiter questions, verifies Fish Audio, and adjusts the existing proportions without new dependencies.

## Projects and missing information

SafeSteps is removed from the assistant's project data and responses. Sehat replaces the former Parsley entry, preserving the documented HTML/CSS/JavaScript work and CSS review animation. The existing browser-to-ESP32 project is presented as **Voice Controlled**, retaining its description, stack, implementation, and robotics aliases. Y-Pay is added using only the supplied screenshots as evidence for its interface description.

| Project | Supplied screenshots | Live Demo | GitHub |
| --- | ---: | --- | --- |
| UniBuddy | 5 | Existing verified link retained | Existing verified link retained |
| Sehat | 4 | Needed | Needed |
| Voice Controlled | 1 | Needed | Needed |
| Y-Pay | 3 | Needed | Needed |
| LogiSense | 0 | Needed | Needed |
| Household Waste Classification Using AI | 0 | Not supplied; documented as a CLI/model | Added from the supplied resume |
| AAYAM Techfest Website | 0 | Needed | Needed |

Verified project URLs in the data:

- UniBuddy demo: https://unibuddyexperiment.vercel.app/
- UniBuddy source: https://github.com/Shaaz-55/unibuddy_experiment
- Waste classifier source, from the resume's GitHub annotation: https://github.com/Shaaz-55/amazon_environment_hackathon

Other URL fields are empty strings. Please supply the missing links above; the waste classifier's demo is optional if there is no hosted interface. Y-Pay also needs an owner-supplied technology stack and implementation/contribution details before the assistant can discuss those confidently.

The PDF contains a different pair of UniBuddy links. The portfolio keeps its previously supplied, verified pair as requested; the supplied PDF itself has not been edited.

## Assets

All 13 supplied WebP images and the real resume PDF are under `public/assets/`. Their original filenames and bytes are preserved. There are no generated images, stock-image substitutions, or empty image files.

- UniBuddy: `cover.webp`, `dashboard.webp`, `map.webp`, `messages.webp`, `mobile.webp`.
- Sehat: `cover.webp` plus all three files in its `screenshots/` directory, labelled Services, Reviews, and Consultation according to their visible content.
- Voice Controlled: `cover.webp`, showing the robot command interface.
- Y-Pay: `cover.webp` plus both files in its `screenshots/` directory, labelled Split expenses and Wallet.
- Resume: `public/assets/resume/shaaz-hemani-resume.pdf`.

No requested image is missing for UniBuddy, Sehat, Voice Controlled, or Y-Pay. The planned `/assets/projects/logisense/cover.webp` is missing and is recorded as pending metadata, never rendered as an image. The waste classifier and AAYAM have no supplied screenshots or prescribed image filenames.

Every project has a card, including projects without screenshots. Projects with multiple images use the existing thumbnail gallery and enlarged preview. The full collection uses a responsive grid. Structured project metadata travels through the conversation service and hook; image paths never become spoken or plain response text. Completed gallery responses begin at the start of the new answer, and manual scrolling remains respected.

## Fish Audio

The repository already used Fish Audio in `interactionServices.js`. That connection was preserved and verified. `api/tts.js` continues to POST to `https://api.fish.audio/v1/tts` with:

- `Authorization: Bearer …` from server-side `FISH_API_KEY`.
- `Content-Type: application/json`.
- HTTP header `model: s2.1-pro-free`.
- JSON fields `text`, `reference_id` from server-side `FISH_VOICE_ID`, and `format: mp3`.

The API returns binary MP3 data as `audio/mpeg`. Tests cover server configuration, streamed JSON bodies, invalid input, upstream rejection, invalid audio, and timeouts. Error responses remain errors and omit credential/upstream body details.

`fishAudioSynthesis.js` uses an HTML Audio element. It now makes cleanup idempotent, verifies that object URLs can be revoked, and reports useful network/rate-limit errors. Tests cover start/end/error callbacks, cancellation, superseded requests, stop, replay, autoplay denial, and object-URL release. Text remains visible when voice fails.

A live local request returned **HTTP 200, `audio/mpeg`, 57,677 bytes**. Chrome decoded that generated MP3, played it, stopped it, replayed it, and reached completion. The browser check observed zero native TTS calls. The legacy browser synthesis adapter remains isolated and is not imported by the active provider or included in the production playback bundle.

Neither environment variable was changed, displayed, or committed. A production-bundle scan found neither configured secret value nor the server variable names.

This establishes technical generation and playback. It does not establish a better clone: if the same voice/model sounds robotic in Fish Audio Playground, that quality needs attention in the clone or source recording. No improved voice quality is claimed here.

## Interview questions

The four homepage suggestions remain. **Browse interview questions** opens a compact, keyboard-accessible dialog with all 32 requested prompts in five categories. The same control remains available during a conversation.

Questions cover introduction, motivation/goals, projects/technology, behaviour/leadership, and product/problem-solving. All 32 resolve intentionally, including after an unrelated project answer. Project follow-ups keep their context; project repository requests no longer resolve to the personal GitHub profile.

Answers use the existing portfolio's education, projects, freelance work, activities, and leadership. Missing mistake/initiative stories, role-specific reasons, current learning details, and Y-Pay implementation information are acknowledged. Suggested approaches are framed as proposals, without new employment, achievements, metrics, or personal stories.

## Avatar, resume, and layout

- Beard and moustache material: `#48474a`; blended beard surface: `#535053`. Only these two colour values changed in the avatar code. Hair materials, face proportions, geometry, rig, camera, and lighting are unchanged.
- The archive has all seven original topic actions plus **Resume**. The PDF opens in a new tab. Asking for the resume exposes a separate accessible download link. Actual PDF bytes, tab opening at desktop/mobile sizes, and download were tested.
- At 1440 × 900, side-monitor width increased from about 180 to 203 pixels and height from about 382 to 437 pixels. The central CRT's glass increased from 440 to 460 pixels in height; its overall width changed by about 1%.
- The avatar/text columns changed from 28% / 70% with a 2% gap to 25% / 74% with a 1% gap. The divider remains visible and the avatar canvas retains its 82% scale.
- At 1440 × 900, the keyboard's measured height decreased from about 182 to 150 pixels through key height, padding, and vertical spacing. All keys and handlers remain. Mobile key height is retained while vertical gaps are smaller.
- Microphone and Send share a rectangular 3-pixel corner radius and equal heights: 38 pixels on desktop, 44 pixels on mobile.
- Desktop, laptop, tablet, and mobile checks include widths from 320 to 1920 pixels. No horizontal overflow or side-monitor overlap was found. Desktop/laptop input and keyboard controls remain accessible; smaller layouts retain vertical scrolling.

## Verification and repository hygiene

- `npm test`: 30 passing tests, including all 32 interview prompts, project/context integrity, real asset signatures, and Fish lifecycle/error handling.
- `npm run build`: successful. The existing separate Three.js chunk still produces Vite's advisory about chunks over 500 kB.
- `APP_URL=http://127.0.0.1:5176 MP3_FIXTURE=artifacts/fish-audio-test.mp3 npm run test:browser`: 48 passing checks, with no browser console errors. Native recognition uses deterministic test doubles; real microphone permission/recognition accuracy was not claimed as tested.
- `node scripts/verify-recovery.mjs --url=http://127.0.0.1:5176`: 14 passing facility checks, including all seven archive actions and the preserved palette. The retained script now polls response state independently of animation frames after an intermittent timeout; a separate browser trace also confirmed every archive action.
- Supplied asset checksums match the original 14 files; total supplied asset size is 1,258,697 bytes.
- `.env`, local environment files, private key files, credential files/directories, `.aws/`, and `.vercel/` are ignored. Project screenshots and the resume are not ignored.
- No runtime dependencies, keyboard handlers, recognition service, or avatar animation modules were changed.

The Git delivery message records the final commit, push result, and Vercel status. The repository's existing Vercel integration was verified from its prior successful commit status; no additional Vercel project was created.

## File inventory

New code and documentation:

- `src/data/interviewQuestions.js`
- `src/components/conversation/QuestionDirectory.jsx`
- `tests/portfolio.test.js`
- `scripts/verify-portfolio.mjs`
- `docs/portfolio-update.md`

Modified code, styles, verification, and documentation:

- `.gitignore`, `README.md`
- `src/data/portfolioData.js`, `src/data/mockResponses.js`
- `src/services/mockConversationService.js`, `src/services/fishAudioSynthesis.js`
- `src/components/ProjectShowcase.jsx`
- `src/components/conversation/ConversationPanel.jsx`
- `src/components/facility/SidePanels.jsx`
- `src/components/avatar/AvatarMaterials.js`, `src/components/avatar/AvatarGeometry.js`
- `src/styles/base.css`, `console.css`, `facility.css`, `responsive.css`, `projectShowcase.css`
- `tests/conversation.test.js`, `tests/fishAudio.test.js`
- `scripts/test-tts.mjs`, `scripts/verify.mjs`, `scripts/verify-showcase.mjs`, `scripts/verify-recovery.mjs`

Newly included repository assets:

- The four existing files under `public/assets/projects/sehat/`.
- The existing file under `public/assets/projects/voice-controlled/`.
- The three existing files under `public/assets/projects/y-pay/`.
- `public/assets/resume/shaaz-hemani-resume.pdf`.

The five UniBuddy images were already tracked and remain included. `api/tts.js`, `interactionServices.js`, and `useSpeechSynthesis.js` were inspected and exercised without unnecessary rewrites. Local screenshots, generated test audio, and audit files remain in ignored `artifacts/`.
