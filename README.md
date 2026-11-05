# PROJECT SHAaz

An interactive portfolio for Shaaz Hemani inside the original green intelligence facility. Physical CRT and side monitors, tall server cabinets, and a mechanical keyboard surround the existing stylised 3D character and personal knowledge base. The enlarged central display gives more space to readable conversation text. Responses remain local and predefined.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm run build
```

Open the local URL printed by Vite. `npm run preview` serves the production build.

## Voice interaction

- Microphone access starts only when the visitor clicks the microphone. Both `SpeechRecognition` and `webkitSpeechRecognition` are supported.
- Partial and final recognition results appear in a live preview. Stop finishes recognition; Cancel discards the recording and preserves the original typed draft.
- Final text is inserted at the saved selection in the existing input. It is never automatically submitted. Visitors can edit it, discard it, or send it with Enter or the Send button. The 500-character limit is preserved.
- While recording, input editing and submission are temporarily locked to prevent transcript conflicts. They return immediately after cancellation or errors.
- Permission denial, missing microphones, no speech, unsupported languages, and recognition network errors have readable text fallbacks.
- Recordings stop when the tab is hidden, on page exit, on unmount, or after 60 seconds. A timeout releases native implementations that fail to report completion.
- Answers never autoplay, including when sound effects are enabled. Each completed answer has a **Listen to response** control and a visible stop control during playback. New playback cancels the previous playback; recording and playback cannot run together.
- The avatar speaks only during actual synthesis playback events. Silent text streaming never moves its mouth. End, stop, error, and page hiding stop speech animation and the waveform.

Browser recognition often uses the browser vendor's online speech service; availability depends on the browser, OS, permissions, and connection. Use HTTPS in deployment or localhost in development. The recording waveform is an animated activity indicator, not a measured audio level. Responses use Fish Audio MP3 playback through /api/tts; there is no browser TTS fallback. Mouth movement is approximate, not phoneme-level lip sync.

Fish Audio runs on the server using FISH_API_KEY and FISH_VOICE_ID. Development reads the local server environment, including .env.local; restart Vite after updating credentials. Vercel Production credentials do not update your local environment. Never use VITE_ prefixes for these secrets. The current local configuration successfully generated an MP3 during the November 2026 update; no environment file was changed.

## Independent replacement boundaries

| Component        | Replacement point                                                          | Contract                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avatar asset     | `public/models/avatar-config.json`, `src/components/avatar/avatarModel.js` | Loader returns `{ root, kind, clips, config, dispose }`; the temporary model also exposes its animation rig.                                                         |
| Avatar animation | `src/components/avatar/avatarAnimation.js`                                 | Factory accepts a loaded model and returns `{ update(time, state, reducedMotion), dispose }`. States: `idle`, `listening`, `thinking`, `speaking`.                   |
| Recognition      | `src/services/browserRecognition.js`                                       | `{ supported, start({ onStart, onResult, onEnd, onError, lang }) }`; start returns `{ stop, cancel }`. Results are `{ final, interim }`; end supplies `{ text }`.    |
| Speech output    | `src/services/fishAudioSynthesis.js`                                         | `{ supported, speak(text, { onStart, onEnd, onError }) }`; speak returns `{ stop }`. Call `onStart` when audio actually starts, and `onEnd`/`onError` when it stops. |
| Conversation     | `src/services/mockConversationService.js`                                  | `reply(question, { signal, context })` resolves `{ content, topic, links, projects, context }`. Honour cancellation and keep history scoped to the conversation.               |

The defaults are wired in `src/services/interactionServices.js`. `App` also accepts a `services` prop for provider injection. Voice hooks own UI state and lifecycle cleanup; providers own native resources and must suppress callbacks after cancellation. `DigitalAvatar` independently accepts `modelLoader`, `animationFactory`, and `configUrl` props. No speech service imports the avatar or conversation components.

Fish Audio receives model s2.1-pro-free as an HTTP header, the environment's voice ID as reference_id, and format mp3. Compare the same model and clone in Fish Audio Playground. Robotic output there means the clone or source recording needs improvement; frontend code cannot repair that quality.

## Replace the temporary character

1. Put your front-facing GLB in `public/models/shaaz-avatar.glb`.
2. In `public/models/avatar-config.json`, set `modelUrl` to `/models/shaaz-avatar.glb` and `kind` to `custom`.
3. Adjust `height`, `offsetY`, `rotationY` (degrees), `cameraPosition`, and `cameraTarget` in the same file as needed. Bust or waist-up models suit the stage best.
4. Map any embedded clips using `animations.idle`, `listening`, `thinking`, and `speaking`. Map the mouth blendshape with `morphs.mouth`; `jawOpen` and `mouthOpen` work by default. Standard blink morphs and common head bones are supported. Missing clips retain gentle procedural movement.

The default `procedural` mode builds the current character in `AvatarGeometry.js`, with materials in `AvatarMaterials.js`. Its beard and moustache use soft charcoal tones; hair, geometry, camera, and lighting are preserved. Invalid or missing custom assets keep this procedural character. Unavailable WebGL displays a static portrait while all conversation and input controls continue working.

The optional bundled portrait-study GLB is **not Shaaz's likeness**. Its adapted head geometry is © I-R Entertainment Ltd., by Lee Perry-Smith / Infinite-Realities, under CC BY 3.0. See [source credits](public/models/ATTRIBUTION.md). The default procedural character does not load that GLB.

## Preserved functionality

Personal facts and retained project descriptions in `src/data/` are preserved. Physical and virtual keyboard insertion, selections, Unicode backspace, Shift, symbols, Space, Enter, press animations, and Shift+Enter remain supported. Contact responses expose the supplied links. The virtual keyboard collapses on mobile and when a native keyboard reduces the visual viewport. Small screens use a scrollable stacked layout instead of shrinking conversation text.

The recovered facility environment uses lightweight CSS, with Three.js reserved for the character. The portrait occupies 25% of the CRT content grid and its canvas is scaled uniformly to 82%; the conversation receives 74%, with a 1% gap. The side monitors are moderately larger, the CRT is taller, and the keyboard is shorter. Microphone and Send controls share rectangular styling. The avatar is loaded separately, capped near 30 FPS and 1.65 pixel ratio, paused in background tabs, and respects reduced motion. Fonts are bundled. There are no new runtime dependencies.

## Verification

```sh
npm test
npm run build
# While the dev server is running:
npm run test:browser
# If Vite selected a different port:
APP_URL=http://127.0.0.1:5174 npm run test:browser
```

The browser suite uses installed Google Chrome on macOS; elsewhere install Playwright Chromium or set `CHROME_PATH`. Screenshots and reports are written to ignored `artifacts/`.

Checks cover nine viewport sizes, keyboard regression behavior, project galleries, interview categories, resume opening and downloading, local responses and contact links, internal scrolling, reset, reduced motion, WebGL fallback, and the complete voice lifecycle. Recognition and HTML Audio doubles provide deterministic lifecycle tests. An optional real MP3 fixture verifies decoding, playback, stop, replay, and completion. Tests never request a real microphone or call a recognition service. Actual microphone permission prompts, recognition accuracy, and audible clone quality require a manual check on the target device.

## Green design recovery

See [the recovery audit](docs/design-recovery.md) for the original source commit, backup location, preserved functionality, and the missing showcase assets identified during inspection.

The existing `scripts/verify.mjs` and `scripts/verify-voice.mjs` were retained without changes during this recovery. Additional layout and archive checks can be run against the same development server:

```sh
node scripts/verify-recovery.mjs --url=http://127.0.0.1:5174
```


## Projects, resume, and interview archive

The portfolio includes UniBuddy, Household Waste Classification Using AI, LogiSense, AAYAM Techfest Website, Sehat, Voice Controlled, and Y-Pay. Project responses carry structured metadata to the showcase. All projects have cards, and the collection adapts to the available width. Thumbnails select a larger preview; clicking the preview opens a keyboard-dismissible dialog. Gallery answers open at the beginning of the new response rather than skipping to its bottom.

All supplied images are present: five for UniBuddy, four for Sehat, one for Voice Controlled, and three for Y-Pay. Original filenames and bytes are retained under `public/assets/projects/`. LogiSense's planned cover is still missing; the waste classifier and AAYAM have no supplied screenshots. Cards with no screenshots render their documented text and links without empty image placeholders.

UniBuddy's existing links are retained. The waste classifier's GitHub URL comes from the supplied resume. Other missing URL fields remain empty. Y-Pay's stack and backend details are not documented; its description is limited to the supplied interface screenshots. See the [complete update and missing-link list](docs/portfolio-update.md).

The right archive monitor opens `public/assets/resume/shaaz-hemani-resume.pdf` in a new tab. Asking for the resume also supplies a download link. The PDF and project screenshots belong in Git; `.env` files, credentials, and private key files remain ignored.

**Browse interview questions** opens a compact directory of 32 prompts across five categories. The four original homepage suggestions remain. Answers distinguish documented experience from proposed approaches and explicitly acknowledge unavailable stories, role details, or project information.

## Fish Audio verification

With the server configured, run:

```sh
npm run dev
# In another terminal:
node scripts/test-tts.mjs http://127.0.0.1:5173
npm test
npm run build
npm run test:browser
```

The live test generates “Hi, I'm Shaaz. Welcome to my portfolio.” and saves `artifacts/fish-audio-test.mp3`. Listen to it and compare it with the same clone and model in Fish Audio Playground. Robotic output in Playground concerns the clone or source recording; working website playback does not establish improved voice quality. The isolated legacy `browserSynthesis.js` adapter is not imported by the active provider and is absent from the production playback bundle.

Run only the six UniBuddy gallery questions, thumbnail interactions, desktop/mobile preview and missing-image checks with `npm run test:browser -- --showcase`. The complete browser suite includes those checks plus the new projects, interview directory, and resume. To test actual MP3 decoding and playback with the generated file, run `MP3_FIXTURE=artifacts/fish-audio-test.mp3 npm run test:browser`. Fixture playback uses a mocked endpoint and does not contact Fish Audio again. Set `APP_URL` if Vite uses a different port.

For deployment, commit the intended code and `public/assets/` files and push the current branch to the existing GitHub remote. The repository's connected Vercel project deploys through its Git integration; both Fish variables must remain server-side Production environment variables.
