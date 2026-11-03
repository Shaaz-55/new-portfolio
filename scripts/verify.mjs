import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const artifacts = new URL("../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : process.platform === "darwin"
      ? {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }
      : {}),
});
const failures = [],
  consoleErrors = [],
  checks = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
const check = async (name, fn) => {
  try {
    await fn();
    checks.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
};
try {
  await page.goto(process.env.APP_URL || "http://127.0.0.1:5173", {
    waitUntil: "networkidle",
  });
  await check("Boot completes without intervention", async () => {
    await page
      .locator(".boot-overlay")
      .waitFor({ state: "hidden", timeout: 4000 });
  });
  await check("WebGL avatar initializes", async () => {
    await page.locator('[data-renderer="ready"] canvas').waitFor();
  });
  await page.screenshot({
    path: new URL("desktop-1440.png", artifacts).pathname,
    fullPage: true,
  });
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1366, 768],
    [1280, 720],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    await check(`Layout ${width}×${height}`, async () => {
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
        input: document
          .querySelector(".input-well")
          .getBoundingClientRect()
          .toJSON(),
        panel: document
          .querySelector(".conversation-panel")
          .getBoundingClientRect()
          .toJSON(),
        suggestions: document
          .querySelector(".suggestions")
          .getBoundingClientRect()
          .toJSON(),
        footer: document
          .querySelector(".screen-bottomline")
          .getBoundingClientRect()
          .toJSON(),
        pageHeight: document.documentElement.scrollHeight,
      }));
      assert.ok(
        dimensions.scroll <= dimensions.viewport,
        `Horizontal overflow: ${JSON.stringify(dimensions)}`,
      );
      assert.ok(
        dimensions.input.bottom <= height,
        `Input below viewport: ${JSON.stringify(dimensions)}`,
      );
      assert.ok(
        dimensions.suggestions.bottom <= dimensions.footer.top + 1,
        `Suggestions overlap screen footer: ${JSON.stringify(dimensions)}`,
      );
    });
    await page.screenshot({
      path: new URL(`layout-${width}.png`, artifacts).pathname,
      fullPage: true,
    });
  }
  if (process.argv.includes("--visual")) {
    await writeFile(
      new URL("visual-report.json", artifacts),
      JSON.stringify({ checks, failures, consoleErrors }, null, 2),
    );
  } else {
    await page.setViewportSize({ width: 1440, height: 900 });
    const input = page.locator("#question-input");
    await check("Physical keyboard and listening state", async () => {
      await input.focus();
      await page.keyboard.down("h");
      assert.ok(
        await page
          .locator('[data-key="H"]')
          .evaluate((element) => element.classList.contains("is-pressed")),
      );
      await page.keyboard.up("h");
      await page.keyboard.type("ello");
      assert.equal(await input.inputValue(), "hello");
      assert.equal(
        await page.locator(".avatar-region").getAttribute("data-avatar-state"),
        "listening",
      );
      await page.waitForTimeout(180);
      assert.ok(
        !(await page
          .locator('[data-key="H"]')
          .evaluate((element) => element.classList.contains("is-pressed"))),
      );
    });
    await check(
      "Virtual shift, letters, space, backspace, numbers and symbols",
      async () => {
        await input.fill("");
        await page.locator('[data-key="Shift"]').click();
        await page.locator('[data-key="H"]').click();
        await page.locator('[data-key="I"]').click();
        await page.locator('[data-key="Space"]').click();
        await page.locator('[data-key="2"]').click();
        await page.locator('[data-key="Backspace"]').click();
        await page.locator('[data-key="1"]').click();
        await page
          .getByRole("button", { name: "Switch to symbols", exact: true })
          .click();
        await page.locator('[data-key="!"]').click();
        assert.equal(await input.inputValue(), "Hi 1!");
        await page
          .getByRole("button", { name: "Switch to letters", exact: true })
          .click();
      },
    );
    await check("Selection replacement and Shift+Enter", async () => {
      await input.fill("hello world");
      await input.evaluate((element) => {
        element.focus();
        element.setSelectionRange(6, 11);
      });
      await page.locator('[data-key="Q"]').click();
      assert.equal(await input.inputValue(), "hello q");
      await page.keyboard.press("Shift+Enter");
      assert.equal(await input.inputValue(), "hello q\n");
    });
    await check("Virtual backspace preserves pasted Unicode text", async () => {
      await input.fill("Hello 👩🏽‍💻");
      await input.evaluate((element) =>
        element.setSelectionRange(element.value.length, element.value.length),
      );
      await page.locator('[data-key="Backspace"]').click();
      assert.equal(await input.inputValue(), "Hello ");
    });
    await check(
      "Physical enter, thinking, speaking and local answer",
      async () => {
        await input.fill("Tell me about SafeSteps");
        await page.keyboard.press("Enter");
        assert.equal(
          await page
            .locator(".avatar-region")
            .getAttribute("data-avatar-state"),
          "thinking",
        );
        assert.ok(await input.evaluate((element) => element.readOnly));
        await page.locator('[data-avatar-state="speaking"]').waitFor();
        await page.waitForFunction(
          () => !document.querySelector("#question-input").readOnly,
          {},
          { timeout: 10000 },
        );
        assert.match(
          await page.locator(".message-shaaz").last().innerText(),
          /visually impaired/,
        );
        assert.equal(await input.inputValue(), "");
      },
    );
    await check("Duplicate submits are prevented", async () => {
      await input.fill("Who are you?");
      await page.locator('[data-key="Enter"]').click();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".message-visitor").count(), 2);
      await page.waitForFunction(
        () => !document.querySelector("#question-input").readOnly,
        {},
        { timeout: 10000 },
      );
    });
    await check("Unknown questions receive honest fallback", async () => {
      await input.fill("What is the weather on Neptune?");
      await page
        .getByRole("button", { name: "Submit question", exact: true })
        .click();
      await page.waitForFunction(
        () => !document.querySelector("#question-input").readOnly,
        {},
        { timeout: 10000 },
      );
      assert.match(
        await page.locator(".message-shaaz").last().innerText(),
        /predefined answers/,
      );
    });
    await check("Conversation scroll stays inside the monitor", async () => {
      const data = await page
        .locator(".conversation-scroll")
        .evaluate((element) => ({
          scroll: element.scrollHeight,
          height: element.clientHeight,
          top: element.scrollTop,
        }));
      assert.ok(data.scroll > data.height);
      assert.ok(data.scroll - data.height - data.top < 5, JSON.stringify(data));
      assert.equal(await page.evaluate(() => window.scrollY), 0);
    });
    await page.screenshot({
      path: new URL("conversation-desktop.png", artifacts).pathname,
      fullPage: true,
    });
    await check("Audio is opt-in and mute works", async () => {
      assert.equal(
        await page
          .getByRole("button", { name: "Enable audio", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
      await page
        .getByRole("button", { name: "Enable audio", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Mute audio", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page
        .getByRole("button", { name: "Mute audio", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Enable audio", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
    });
    await check("Clear session and prompt shortcuts", async () => {
      await page
        .getByRole("button", {
          name: "Clear conversation and start a new session",
          exact: true,
        })
        .click();
      assert.equal(await page.locator(".message").count(), 0);
      await page.getByRole("button", { name: "01 Who is Shaaz?" }).click();
      await page.waitForFunction(
        () => !document.querySelector("#question-input").readOnly,
        {},
        { timeout: 10000 },
      );
      assert.match(
        await page.locator(".message-shaaz").innerText(),
        /computer science student/,
      );
    });
    await check("Mobile touch keyboard and readable conversation", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "SHOW KEYS" }).click();
      assert.ok(await page.locator(".keyboard-body").isVisible());
      await input.fill("");
      await page.locator('[data-key="A"]').click();
      assert.equal(await input.inputValue(), "a");
      await page.getByRole("button", { name: "HIDE KEYS" }).click();
      assert.ok(!(await page.locator(".keyboard-body").isVisible()));
      await page.screenshot({
        path: new URL("conversation-mobile.png", artifacts).pathname,
        fullPage: true,
      });
    });
    await check("Reduced motion preserves conversation", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page
        .getByRole("button", {
          name: "Clear conversation and start a new session",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "02 Explore my projects" })
        .click();
      await page.waitForFunction(
        () => !document.querySelector("#question-input").readOnly,
        {},
        { timeout: 4000 },
      );
      assert.match(
        await page.locator(".message-shaaz").innerText(),
        /UniBuddy/,
      );
      assert.equal(
        await page
          .locator(".blinking-cursor")
          .first()
          .evaluate((element) => getComputedStyle(element).animationName),
        "none",
      );
    });
    await check("WebGL fallback works", async () => {
      const fallbackPage = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const errors = [];
      fallbackPage.on("pageerror", (error) => errors.push(error.message));
      fallbackPage.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await fallbackPage.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type.includes("webgl")
            ? null
            : original.call(this, type, ...args);
        };
      });
      await fallbackPage.goto(process.env.APP_URL || "http://127.0.0.1:5173");
      await fallbackPage
        .locator('[data-renderer="fallback"]')
        .waitFor({ state: "attached" });
      await fallbackPage.locator(".boot-overlay").waitFor({ state: "hidden" });
      assert.ok(await fallbackPage.locator(".avatar-fallback").isVisible());
      await fallbackPage.locator("#question-input").fill("Hello");
      assert.equal(
        await fallbackPage.locator("#question-input").inputValue(),
        "Hello",
      );
      await fallbackPage.screenshot({
        path: new URL("webgl-fallback.png", artifacts).pathname,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await fallbackPage.close();
    });
    await check(
      "Speech lifecycle starts only when enabled and stops on mute",
      async () => {
        const speechPage = await browser.newPage({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        });
        await speechPage.addInitScript(() => {
          window.speechCalls = [];
          Object.defineProperty(window, "speechSynthesis", {
            value: {
              cancel() {
                window.speechCalls.push("cancel");
              },
              speak(utterance) {
                window.speechCalls.push(utterance.text);
                queueMicrotask(() => utterance.onstart?.());
              },
            },
          });
        });
        await speechPage.goto(process.env.APP_URL || "http://127.0.0.1:5173");
        await speechPage.locator(".boot-overlay").waitFor({ state: "hidden" });
        assert.ok(
          (await speechPage.evaluate(() => window.speechCalls)).every(
            (call) => call === "cancel",
          ),
        );
        await speechPage
          .getByRole("button", { name: "Enable audio", exact: true })
          .click();
        await speechPage
          .getByRole("button", { name: "01 Who is Shaaz?" })
          .click();
        await speechPage.locator('[data-avatar-state="speaking"]').waitFor();
        assert.ok(
          (await speechPage.evaluate(() => window.speechCalls)).some((call) =>
            call.includes("I'm Shaaz"),
          ),
        );
        await speechPage
          .getByRole("button", { name: "Mute audio", exact: true })
          .click();
        await speechPage.locator('[data-avatar-state="idle"]').waitFor();
        assert.equal(
          await speechPage.evaluate(() => window.speechCalls.at(-1)),
          "cancel",
        );
        await speechPage.close();
      },
    );
    await check(
      "Unavailable browser speech preserves the full text experience",
      async () => {
        const textPage = await browser.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion: "reduce",
        });
        await textPage.addInitScript(() =>
          Object.defineProperty(window, "speechSynthesis", {
            value: undefined,
          }),
        );
        await textPage.goto(process.env.APP_URL || "http://127.0.0.1:5173");
        await textPage.locator(".boot-overlay").waitFor({ state: "hidden" });
        await textPage
          .getByRole("button", { name: "Enable audio", exact: true })
          .click();
        assert.match(
          await textPage.locator(".audio-notice").innerText(),
          /Voice is unavailable/,
        );
        await textPage
          .getByRole("button", { name: "01 Who is Shaaz?" })
          .click();
        await textPage.waitForFunction(() =>
          document
            .querySelector(".message-shaaz p")
            ?.textContent.includes("I'm Shaaz"),
        );
        await textPage.close();
      },
    );
    await check("No browser console errors", async () =>
      assert.deepEqual(consoleErrors, []),
    );
    await writeFile(
      new URL("verification-report.json", artifacts),
      JSON.stringify({ checks, failures, consoleErrors }, null, 2),
    );
  }
} finally {
  await browser.close();
}
if (failures.length || consoleErrors.length) {
  console.error({ failures, consoleErrors });
  process.exitCode = 1;
} else console.log(`Verified ${checks.length} checks.`);
