# PROJECT SHAaz

A frontend-only, interactive portfolio for Shaaz Hemani. A physical-looking CRT and mechanical keyboard sit inside an original layered control room inspired by the supplied image's atmosphere. Visitors explore the portfolio through local, predefined conversations.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Use `npm run build` for the production build and `npm run preview` to preview it.

## Implemented

- Responsive CSS facility with server cabinets, side monitors, physical CRT construction and scanlines.
- A locally rendered Three.js bust with idle, listening, thinking and speaking states, blinking and subtle head movement. A lightweight procedural head remains available while the bundled portrait geometry loads; an SVG portrait handles unavailable WebGL.
- A short, skippable boot sequence, remembered for the current browser session.
- Native text input, paste, selection replacement, physical key animations, clickable QWERTY keys, numbers, symbols, Shift, Space, Backspace and Enter. Shift+Enter adds a newline. The keyboard collapses on mobile.
- Fifteen predefined topic responses, project shortcuts, honest unknown-question fallbacks, typewriter responses, internal conversation scrolling, polite screen-reader announcements and a clear-session control.
- Opt-in generated key sounds and browser-native speech output. Audio starts muted, can be stopped immediately, and is cancelled when the tab is hidden or the app is unmounted.
- Bundled fonts, reduced-motion support, visible focus states and no external conversation calls.

## Main files

| Location                                  | Purpose                                                               |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `src/App.jsx`                             | Experience composition and shared interaction state                   |
| `src/components/`                         | Facility, monitor, avatar, conversation, input, keyboard and HUD      |
| `src/hooks/`                              | Conversation lifecycle, keyboard editing, audio and motion preference |
| `src/data/portfolioData.js`               | Verified identity and project information                             |
| `src/data/mockResponses.js`               | Editable responses and topic matching                                 |
| `src/services/mockConversationService.js` | Cancellable async service boundary for a future integration           |
| `src/styles/`                             | Scene, hardware, typography and responsive layout                     |
| `scripts/verify.mjs`                      | Browser interaction and layout verification                           |
| `tests/conversation.test.js`              | Required topic coverage, cancellation and input validation            |

## Replace the avatar

1. Place a front-facing, preferably waist-up or bust GLB at **`public/models/shaaz-avatar.glb`**.
2. Change `modelUrl` in **`public/models/avatar-config.json`** to `"/models/shaaz-avatar.glb"`.
3. The model is centred and scaled to the portrait stage. Adjust the camera and framing in `src/components/avatar/DigitalAvatar.jsx` for a model with different proportions.

Morph targets named `jawOpen` or `mouthOpen` are supported for basic speaking. Custom models without those targets retain subtle head movement. The working placeholder is retained if a configured model fails to load.

The bundled character is an illustrative stand-in, **not Shaaz's actual likeness**. The adapted head geometry is © I-R Entertainment Ltd., by Lee Perry-Smith / Infinite-Realities, under CC BY 3.0. Full attribution and modification details are in [public/models/ATTRIBUTION.md](public/models/ATTRIBUTION.md). Clothing, hair, materials, scene and procedural animation are created for this project. No movie assets, characters or audio are used.

## Dependencies

Runtime: React, React DOM, Three.js, and locally bundled Space Grotesk / IBM Plex Mono fonts. Development: Vite, the React Vite plugin, Playwright and Prettier.

The 3D component is loaded as a separate chunk so the core conversation interface can render independently. Rendering is capped at approximately 30 FPS and 1.65 device pixel ratio, with reduced update frequency for reduced motion and no rendering while the tab is hidden.

## Verification

```sh
npm test
npm run build
# In a second terminal while npm run dev is running:
npm run test:browser
```

The browser script uses installed Google Chrome on macOS. On other systems, install Playwright Chromium with `npx playwright install chromium`, or set `CHROME_PATH` to a compatible browser executable. Set `APP_URL` if the Vite port differs.

Browser verification covers 1440×900, 1920×1080, 1366×768, 1280×720, 1024×768, 768×1024, 390×844 and 320×740; keyboard editing and animation; duplicate submissions; avatar states; local responses; scrolling; audio toggles; reset; reduced motion; and WebGL fallback. Screenshots and machine-readable reports are saved in ignored `artifacts/`.

## Current limitations

- Answers are intentionally predefined. This is not an AI backend; conversation history is in memory and resets on refresh.
- Verified contact details, institution, detailed technology stacks, achievements and personal experience stories were not supplied. The demo explicitly says when information is missing.
- Browser voice availability and quality vary by device. Speech follows the displayed answer but does not provide phoneme-level lip sync. Microphone input is not included.
- The current avatar is a stylised placeholder. A bespoke rigged avatar is needed for a precise likeness and detailed facial acting.
- The environment uses layered CSS rather than a freely navigable 3D room. Tablet and mobile layouts simplify the surrounding hardware.
