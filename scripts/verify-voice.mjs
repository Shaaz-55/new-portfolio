import assert from "node:assert/strict";

// Deterministic native-API doubles exercise the real UI without microphone access,
// external recognition services, audio hardware, or a paid provider.
function installVoiceDoubles({ prefixed = false, unsupported = false } = {}) {
  window.voiceTest = { starts: 0, stops: 0, aborts: 0, plays: [], cancels: 0 };
  const test = window.voiceTest;
  class Recognition {
    constructor() {
      test.recognition = this;
    }
    start() {
      test.starts++;
      queueMicrotask(() => this.onstart?.());
    }
    stop() {
      test.stops++;
    }
    abort() {
      test.aborts++;
    }
  }
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: !unsupported && !prefixed ? Recognition : undefined,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    configurable: true,
    value: !unsupported && prefixed ? Recognition : undefined,
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: class {
      constructor(text) {
        this.text = text;
      }
    },
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: unsupported
      ? undefined
      : {
          cancel() {
            test.cancels++;
          },
          getVoices() {
            return [
              { name: "Test English", lang: "en-IN", localService: true },
            ];
          },
          speak(utterance) {
            test.utterance = utterance;
            test.plays.push(utterance.text);
            queueMicrotask(() => utterance.onstart?.());
          },
        },
  });
  test.results = (segments) =>
    test.recognition.onresult?.({
      results: segments.map(([transcript, isFinal]) =>
        Object.assign([{ transcript }], { isFinal }),
      ),
    });
  test.end = () => test.recognition.onend?.();
}

export async function verifyVoice({
  browser,
  check,
  appUrl,
  artifacts,
  consoleErrors,
}) {
  const makePage = async (options = {}) => {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.addInitScript(installVoiceDoubles, options);
    await page.goto(appUrl);
    await page.locator(".boot-overlay").waitFor({ state: "hidden" });
    return page;
  };
  for (const prefixed of [false, true])
    await check(
      `${prefixed ? "WebKit" : "Standard"} recognition: click, live transcript, stop, edit, submit`,
      async () => {
        const page = await makePage({ prefixed });
        try {
          const input = page.locator("#question-input");
          assert.equal(await page.evaluate(() => voiceTest.starts), 0);
          assert.deepEqual(await page.evaluate(() => voiceTest.plays), []);
          await input.fill("Tell me about");
          await input.evaluate((node) =>
            node.setSelectionRange(node.value.length, node.value.length),
          );
          await page
            .getByRole("button", { name: "Start voice input", exact: true })
            .click();
          await page.locator(".voice-listening").waitFor();
          assert.equal(await page.evaluate(() => voiceTest.starts), 1);
          assert.equal(
            await page
              .locator(".avatar-region")
              .getAttribute("data-avatar-state"),
            "listening",
          );
          await page.evaluate(() =>
            voiceTest.results([
              ["your", true],
              ["proje", false],
            ]),
          );
          assert.equal(
            await page.locator(".live-transcript").innerText(),
            "your proje",
          );
          assert.equal(await input.inputValue(), "Tell me about");
          assert.ok(
            await page
              .getByRole("button", { name: "Submit question", exact: true })
              .isDisabled(),
          );
          await page.evaluate(() =>
            voiceTest.results([
              ["your", true],
              ["projects", true],
            ]),
          );
          await page
            .getByRole("button", { name: "Stop recording", exact: true })
            .click();
          assert.match(
            await page.locator(".recording-status").innerText(),
            /PROCESSING VOICE INPUT/,
          );
          await page.evaluate(() => voiceTest.end());
          await page.locator(".voice-transcribed").waitFor();
          assert.equal(await input.inputValue(), "Tell me about your projects");
          assert.equal(await page.locator(".message").count(), 0);
          await input.fill("Tell me about UniBuddy");
          await input.press("Enter");
          await page.waitForFunction(
            () => !document.querySelector("#question-input").readOnly,
          );
          assert.match(
            await page.locator(".message-shaaz").innerText(),
            /UniBuddy/,
          );
          assert.deepEqual(await page.evaluate(() => voiceTest.plays), []);
          if (!prefixed)
            await page.screenshot({
              path: new URL("voice-draft-desktop.png", artifacts).pathname,
              fullPage: true,
            });
        } finally {
          await page.close();
        }
      },
    );

  await check(
    "Cancel, discard, repeated sessions and late recognition events preserve the draft",
    async () => {
      const page = await makePage();
      try {
        const input = page.locator("#question-input");
        await input.fill("Original question");
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        await page.evaluate(() => {
          voiceTest.lateResult = voiceTest.recognition.onresult;
          voiceTest.lateEnd = voiceTest.recognition.onend;
          voiceTest.results([["discard this", true]]);
        });
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.evaluate(() => {
          voiceTest.lateResult({
            results: [
              Object.assign([{ transcript: "late text" }], { isFinal: true }),
            ],
          });
          voiceTest.lateEnd();
        });
        assert.equal(await input.inputValue(), "Original question");
        assert.equal(await page.evaluate(() => voiceTest.aborts), 1);
        assert.ok(!(await input.evaluate((node) => node.readOnly)));
        await input.evaluate((node) =>
          node.setSelectionRange(0, node.value.length),
        );
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        await page.evaluate(() => {
          voiceTest.results([["replacement", true]]);
          voiceTest.end();
        });
        await page.locator(".voice-transcribed").waitFor();
        assert.equal(await input.inputValue(), "replacement");
        await page
          .getByRole("button", { name: "Discard voice text", exact: true })
          .click();
        assert.equal(await input.inputValue(), "Original question");
        assert.equal(await page.locator(".message").count(), 0);
      } finally {
        await page.close();
      }
    },
  );

  await check(
    "Permission denial, no speech, missing microphone and network errors retain typing and retry",
    async () => {
      const page = await makePage();
      try {
        for (const error of [
          "not-allowed",
          "no-speech",
          "audio-capture",
          "network",
        ]) {
          await page
            .getByRole("button", { name: "Start voice input", exact: true })
            .click();
          await page.locator(".voice-listening").waitFor();
          await page.evaluate(
            (error) => voiceTest.recognition.onerror({ error }),
            error,
          );
          await page.locator(".voice-error").waitFor();
          assert.match(await page.locator("#voice-status").innerText(), /typ/i);
          await page.locator("#question-input").fill("Keyboard still works");
        }
        assert.equal(await page.evaluate(() => voiceTest.starts), 4);
      } finally {
        await page.close();
      }
    },
  );

  await check(
    "Voice playback is manual per answer, stops cleanly, and never follows silent text",
    async () => {
      const page = await makePage();
      try {
        await page
          .getByRole("button", { name: "Enable sound effects", exact: true })
          .click();
        await page.getByRole("button", { name: "01 Who is Shaaz?" }).click();
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .waitFor();
        assert.deepEqual(await page.evaluate(() => voiceTest.plays), []);
        assert.equal(
          await page
            .locator(".avatar-region")
            .getAttribute("data-avatar-state"),
          "idle",
        );
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .click();
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        assert.equal((await page.evaluate(() => voiceTest.plays)).length, 1);
        await page.evaluate(() => {
          voiceTest.staleSpeechEnd = voiceTest.utterance.onend;
        });
        await page
          .getByRole("button", { name: "Stop speaking", exact: true })
          .click();
        await page.locator('[data-avatar-state="idle"]').waitFor();
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .click();
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        await page.evaluate(() => voiceTest.staleSpeechEnd());
        assert.equal(
          await page
            .locator(".avatar-region")
            .getAttribute("data-avatar-state"),
          "speaking",
        );
        await page.evaluate(() => voiceTest.utterance.onend());
        await page.locator('[data-avatar-state="idle"]').waitFor();
        assert.ok(
          !(await page
            .locator(".avatar-region .voice-bars")
            .evaluate((node) => node.classList.contains("is-active"))),
        );
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .click();
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        assert.equal(
          await page
            .locator(".avatar-region")
            .getAttribute("data-avatar-state"),
          "listening",
        );
        assert.equal(
          await page.evaluate(() => voiceTest.utterance.onend),
          null,
        );
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .click();
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        await page.evaluate(() =>
          voiceTest.utterance.onerror({ error: "synthesis-failed" }),
        );
        await page.locator('[data-avatar-state="idle"]').waitFor();
        assert.match(
          await page.locator(".audio-notice").innerText(),
          /full answer/,
        );
        assert.match(
          await page.locator(".message-shaaz p").innerText(),
          /Shaaz/,
        );
      } finally {
        await page.close();
      }
    },
  );

  await check(
    "Page hiding and page exit stop recognition and speech",
    async () => {
      const page = await makePage();
      try {
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.locator(".voice-idle").waitFor();
        assert.equal(
          await page.evaluate(() => voiceTest.recognition.onresult),
          null,
        );
        assert.equal(await page.evaluate(() => voiceTest.aborts), 1);
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: false,
          });
        });
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
        await page.locator(".voice-idle").waitFor();
        assert.equal(await page.evaluate(() => voiceTest.aborts), 2);
        await page.getByRole("button", { name: "01 Who is Shaaz?" }).click();
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .click();
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.locator('[data-avatar-state="idle"]').waitFor();
        assert.equal(
          await page.evaluate(() => voiceTest.utterance.onend),
          null,
        );
      } finally {
        await page.close();
      }
    },
  );

  await check(
    "Unsupported speech preserves the mobile keyboard and written answers",
    async () => {
      const page = await makePage({ unsupported: true });
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await page
            .getByRole("button", { name: "Start voice input", exact: true })
            .isDisabled(),
        );
        assert.match(
          await page.locator("#voice-status").innerText(),
          /unavailable.*type/,
        );
        await page.locator("#question-input").fill("Who are you?");
        await page
          .getByRole("button", { name: "Submit question", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Play response 1", exact: true })
          .waitFor();
        assert.ok(
          await page
            .getByRole("button", { name: "Play response 1", exact: true })
            .isDisabled(),
        );
        assert.match(
          await page.locator(".message-shaaz p").innerText(),
          /Shaaz/,
        );
        await page.getByRole("button", { name: "SHOW KEYS" }).click();
        await page.locator('[data-key="A"]').click();
        assert.equal(await page.locator("#question-input").inputValue(), "a");
      } finally {
        await page.close();
      }
    },
  );

  await check(
    "Recording and waveform fit the mobile layout; reduced motion stops animation",
    async () => {
      const page = await makePage();
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page
          .getByRole("button", { name: "Start voice input", exact: true })
          .click();
        await page.locator(".voice-listening").waitFor();
        await page.evaluate(() =>
          voiceTest.results([
            ["Tell me about", true],
            ["your projects", false],
          ]),
        );
        assert.equal(
          await page
            .locator(".recording-status .voice-bars i")
            .first()
            .evaluate((node) => getComputedStyle(node).animationName),
          "signal",
        );
        await page.screenshot({
          path: new URL("recording-mobile.png", artifacts).pathname,
          fullPage: true,
        });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth),
          390,
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(
          await page
            .locator(".recording-status .voice-bars i")
            .first()
            .evaluate((node) => getComputedStyle(node).animationName),
          "none",
        );
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
      } finally {
        await page.close();
      }
    },
  );
}
