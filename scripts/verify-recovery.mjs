import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { portfolioData, archiveSections } from "../src/data/portfolioData.js";

const appUrl =
  process.env.APP_URL ||
  process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) ||
  "http://127.0.0.1:5173";
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
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const checks = [],
  failures = [],
  consoleErrors = [],
  layouts = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (event) => {
  if (event.type() === "error")
    consoleErrors.push(`${event.text()} ${event.location().url || ""}`.trim());
});
const check = async (name, run) => {
  try {
    await run();
    checks.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
};
try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    await check(
      `Physical CRT proportions, side clearance and visible keyboard ${width}×${height}`,
      async () => {
        const layout = await page.evaluate(() => {
          const bounds = (selector) =>
            document.querySelector(selector).getBoundingClientRect().toJSON();
          return {
            station: bounds(".station"),
            monitor: bounds(".monitor-assembly"),
            content: bounds(".screen-content"),
            avatar: bounds(".avatar-region"),
            conversation: bounds(".conversation-panel"),
            left: bounds(".side-left"),
            right: bounds(".side-right"),
            input: bounds(".input-well"),
            keyboard: bounds(".keyboard-assembly"),
            lastKeys: [
              ...document.querySelectorAll(".keyboard-row:last-child .key"),
            ].map((key) => key.getBoundingClientRect().bottom),
            scale: getComputedStyle(document.querySelector(".avatar-canvas"))
              .transform,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
        layouts.push({ width, height, ...layout });
        const monitorShare = layout.monitor.width / layout.station.width;
        assert.ok(
          monitorShare >= 0.69 && monitorShare <= 0.75,
          `CRT should retain the primary share of the station: ${monitorShare}`,
        );
        assert.ok(
          layout.left.right + 5 <= layout.monitor.left,
          "Left monitor overlaps CRT",
        );
        assert.ok(
          layout.monitor.right + 5 <= layout.right.left,
          "Right monitor overlaps CRT",
        );
        assert.ok(layout.input.bottom < height, "Input outside viewport");
        assert.ok(
          layout.keyboard.bottom + 6 <= height,
          `Keyboard ends at ${layout.keyboard.bottom}; viewport ${height}`,
        );
        assert.ok(
          Math.max(...layout.lastKeys) <= height - 6,
          "Last key row clipped",
        );
        assert.ok(layout.scrollWidth <= width, "Horizontal overflow");
        assert.ok(
          layout.avatar.width / layout.content.width >= 0.245 &&
            layout.avatar.width / layout.content.width <= 0.255,
        );
        assert.ok(
          layout.conversation.width / layout.content.width >= 0.73 &&
            layout.conversation.width / layout.content.width <= 0.75,
        );
        assert.match(layout.scale, /^matrix\(0\.82,/);
        assert.ok(
          layout.avatar.right < layout.conversation.left,
          "Avatar collides with conversation",
        );
      },
    );
    await page.screenshot({
      path: new URL(`recovered-${width}.png`, artifacts).pathname,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await check(
    "Original green palette and physical hardware are present without glass styling",
    async () => {
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).backgroundColor,
        ),
        "rgb(7, 16, 13)",
      );
      assert.equal(
        await page
          .locator(".crt-glass")
          .evaluate((node) => getComputedStyle(node).backgroundColor),
        "rgb(6, 19, 13)",
      );
      assert.equal(await page.locator(".server-rack").count(), 10);
      assert.equal(await page.locator(".monitor-bezel .screw").count(), 4);
      assert.equal(
        await page
          .locator(".monitor-assembly")
          .evaluate((node) => getComputedStyle(node).backdropFilter),
        "none",
      );
      assert.equal(
        await page
          .locator(
            ".room-footer, .avatar-coordinate, .projection-orbit, .holographic-workstation",
          )
          .count(),
        0,
      );
      const css = (
        await Promise.all(
          ["base", "console", "facility", "responsive"].map((name) =>
            readFile(
              new URL(`../src/styles/${name}.css`, import.meta.url),
              "utf8",
            ),
          ),
        )
      ).join("\n");
      assert.doesNotMatch(
        css,
        /--(?:cyan|blue|violet|ice)\b|backdrop-filter|#(?:42d9ff|398bff|9586ff|050b16|09182b)\b/i,
      );
    },
  );
  const waitForAnswer = async () =>
    page.waitForFunction(
      () =>
        document.querySelector(".message-shaaz") &&
        !document.querySelector("#question-input").readOnly,
      undefined,
      { polling: 100, timeout: 10000 },
    );
  const ask = async (question) => {
    await page.locator("#question-input").fill(question);
    await page
      .getByRole("button", { name: "Submit question", exact: true })
      .click();
    await waitForAnswer();
  };
  await check(
    "Seven archive actions remain connected alongside the resume link",
    async () => {
      assert.equal(await page.locator(".side-right .module-link").count(), 8);
      for (const section of archiveSections.filter(
        (section) => section.question,
      )) {
        const label =
          section.id === "leadership" ? "Leadership" : section.label;
        await page
          .locator(".side-right")
          .getByRole("button", { name: label, exact: true })
          .click();
        await waitForAnswer();
        assert.equal(
          await page.locator(".message-visitor p").last().innerText(),
          section.question,
        );
        assert.ok(
          (await page.locator(".message-shaaz > p").last().innerText()).length >
            40,
        );
      }
    },
  );
  await check(
    "Contact links retain the supplied GitHub, LinkedIn and email targets",
    async () => {
      for (const url of [
        portfolioData.contact.github,
        portfolioData.contact.linkedin,
        `mailto:${portfolioData.contact.email}`,
      ]) {
        const link = page.locator(`.response-links a[href="${url}"]`).last();
        assert.ok(await link.isVisible());
        assert.equal(await link.getAttribute("target"), "_blank");
        assert.match(await link.getAttribute("rel"), /noopener/);
      }
    },
  );
  await check(
    "Project archive and project-specific follow-up context are preserved",
    async () => {
      await ask("What projects have you built?");
      const archive = await page.locator(".message-shaaz").last().innerText();
      for (const project of portfolioData.projects)
        assert.ok(archive.includes(project.name), project.name);
      await ask("Tell me about household waste classification");
      assert.match(
        await page.locator(".message-shaaz > p").last().innerText(),
        /97\.53%/,
      );
      await ask("What were the challenges?");
      assert.match(
        await page.locator(".message-shaaz > p").last().innerText(),
        /duplicate-aware/,
      );
      assert.equal(await page.locator(".message-visitor").count(), 10);
    },
  );
  await check(
    "Long responses use readable desktop typography and scroll inside the CRT",
    async () => {
      const metrics = await page
        .locator(".message-shaaz > p")
        .last()
        .evaluate((node) => ({
          size: parseFloat(getComputedStyle(node).fontSize),
          line: parseFloat(getComputedStyle(node).lineHeight),
        }));
      assert.ok(metrics.size >= 15 && metrics.size <= 17);
      assert.ok(metrics.line / metrics.size >= 1.6);
      const scroll = await page
        .locator(".conversation-scroll")
        .evaluate((node) => ({
          height: node.clientHeight,
          total: node.scrollHeight,
          top: node.scrollTop,
        }));
      assert.ok(scroll.total > scroll.height);
      assert.ok(
        scroll.top >= 0 && scroll.top <= scroll.total - scroll.height + 1,
      );
      await page.screenshot({
        path: new URL("recovered-conversation.png", artifacts).pathname,
        fullPage: true,
      });
    },
  );
  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await check(
      `Tablet/mobile controls and both archive panels ${width}×${height}`,
      async () => {
        assert.ok(await page.locator(".side-left").isVisible());
        assert.ok(await page.locator(".side-right").isVisible());
        assert.equal(await page.locator(".side-right .module-link").count(), 8);
        assert.ok(await page.locator("#question-input").isVisible());
        assert.ok(
          await page
            .getByRole("button", { name: "Start voice input", exact: true })
            .isVisible(),
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        assert.match(
          await page.locator(".side-left h2").innerText(),
          /SHAAZ\s+HEMANI/,
        );
      },
    );
    await page.screenshot({
      path: new URL(`recovered-conversation-${width}.png`, artifacts).pathname,
      fullPage: true,
    });
  }
  await check("No browser console errors", () =>
    assert.deepEqual(consoleErrors, []),
  );
} finally {
  await browser.close();
  await writeFile(
    new URL("recovery-report.json", artifacts),
    JSON.stringify({ checks, failures, consoleErrors, layouts }, null, 2),
  );
}
if (failures.length) process.exitCode = 1;
else console.log(`Verified ${checks.length} recovery checks.`);
