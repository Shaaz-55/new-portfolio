import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { verifyVoice } from "./verify-voice.mjs";

const artifacts = new URL("../artifacts/", import.meta.url);
const appUrl =
  process.env.APP_URL ||
  process.argv.find((argument) => argument.startsWith("--url="))?.slice(6) ||
  "http://127.0.0.1:5173";
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
if (process.argv.includes("--showcase")) {
  try {
    const { verifyShowcase } = await import("./verify-showcase.mjs");
    await verifyShowcase({ browser, appUrl, artifacts });
  } finally { await browser.close(); }
  process.exit(0);
}
try {
  await page.goto(appUrl, {
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
  await check("Skip link is hidden until keyboard focus", async () => {
    const link = page.locator(".skip-link");
    assert.equal(
      await link.evaluate((node) => getComputedStyle(node).clipPath),
      "inset(50%)",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await link.evaluate((node) => document.activeElement === node),
      true,
    );
    assert.equal(
      await link.evaluate((node) => getComputedStyle(node).clipPath),
      "none",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await link.evaluate((node) => getComputedStyle(node).clipPath),
      "inset(50%)",
    );
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
        width < 768 || dimensions.input.bottom <= height,
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
      // Let the preceding virtual key finish restoring its caret before replacing the draft.
      await input.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ));
      await input.fill("Hello 👩🏽‍💻");
      assert.equal(await input.inputValue(), "Hello 👩🏽‍💻");
      await input.evaluate((element) =>
        element.setSelectionRange(element.value.length, element.value.length),
      );
      await page.locator('[data-key="Backspace"]').click();
      assert.equal(await input.inputValue(), "Hello ");
    });
    await check(
      "Physical enter, thinking and silent local answer",
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
        await page.locator(".message-shaaz").first().waitFor();
        assert.notEqual(
          await page
            .locator(".avatar-region")
            .getAttribute("data-avatar-state"),
          "speaking",
        );
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
        /responses are predefined/,
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
      assert.ok(await page.locator(".conversation-scroll").isVisible());
    });
    await page.screenshot({
      path: new URL("conversation-desktop.png", artifacts).pathname,
      fullPage: true,
    });
    await check("Audio is opt-in and mute works", async () => {
      assert.equal(
        await page
          .getByRole("button", { name: "Enable sound effects", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
      await page
        .getByRole("button", { name: "Enable sound effects", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Mute sound effects", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page
        .getByRole("button", { name: "Mute sound effects", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Enable sound effects", exact: true })
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
        /computer science engineering student/i,
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
      await fallbackPage.goto(appUrl);
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
      "A custom GLB replaces the stand-in using configuration alone",
      async () => {
        const modelPage = await browser.newPage({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        });
        modelPage.on("pageerror", (error) => consoleErrors.push(error.message));
        try {
          await modelPage.route("**/models/avatar-config.json", (route) =>
            route.fulfill({
              json: {
                modelUrl: "/models/portrait-study.glb",
                kind: "custom",
                height: 3.4,
              },
            }),
          );
          await modelPage.goto(appUrl);
          await modelPage.getByText("CUSTOM AVATAR", { exact: true }).waitFor();
          await modelPage.locator("#question-input").fill("Hello");
          assert.equal(
            await modelPage.locator("#question-input").inputValue(),
            "Hello",
          );
        } finally {
          await modelPage.close();
        }
      },
    );
    await check(
      "An invalid custom GLB retains the working stand-in",
      async () => {
        const modelPage = await browser.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion: "reduce",
        });
        modelPage.on("pageerror", (error) => consoleErrors.push(error.message));
        try {
          await modelPage.route("**/models/avatar-config.json", (route) =>
            route.fulfill({
              json: { modelUrl: "/models/test-invalid.glb", kind: "custom" },
            }),
          );
          await modelPage.route("**/models/test-invalid.glb", (route) =>
            route.fulfill({ body: "invalid GLB" }),
          );
          await modelPage.goto(appUrl, { waitUntil: "networkidle" });
          assert.ok(
            await modelPage
              .locator('[data-renderer="ready"] canvas')
              .isVisible(),
          );
          assert.match(
            await modelPage.locator(".avatar-disclosure").innerText(),
            /^PORTRAIT STUDY$/,
          );
          await modelPage.locator("#question-input").fill("Hello");
          assert.equal(
            await modelPage.locator("#question-input").inputValue(),
            "Hello",
          );
        } finally {
          await modelPage.close();
        }
      },
    );
    await verifyVoice({
      browser,
      check,
      appUrl: appUrl,
      artifacts,
      consoleErrors,
    });
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
