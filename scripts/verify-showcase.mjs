import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function verifyShowcase({ browser, appUrl, artifacts }) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.addInitScript(() => {
    sessionStorage.setItem("shaaz-booted", "1");
    window.nativeSpeechCalls = 0;
    window.speechSynthesis.speak = () => {
      window.nativeSpeechCalls++;
    };
    window.playedMp3 = 0;
    const OriginalAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new OriginalAudio(...args);
      audio.addEventListener("playing", () => window.playedMp3++);
      return audio;
    };
  });
  await page.goto(appUrl);
  const questions = [
    ["Tell me about UniBuddy.", "Cover"],
    ["Show me the dashboard.", "Dashboard"],
    ["Show me the map.", "Map"],
    ["Show me the messages interface.", "Messages"],
    ["Show me the mobile version.", "Mobile"],
    ["Show me all my projects.", "Cover"],
  ];
  for (const [question, selected] of questions) {
    await page.locator("#question-input").fill(question);
    await page.locator("#question-input").press("Enter");
    await page.waitForFunction(
      () => !document.querySelector("#question-input").readOnly,
    );
    const card = page.locator(".project-showcase").last();
    assert.equal(await card.locator(".project-thumbnails img").count(), 5);
    await card
      .locator(".project-thumbnails img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    assert.equal(
      await card.locator('[aria-pressed="true"]').innerText(),
      selected,
    );
    assert.equal(
      await card.getByRole("link", { name: "Live Demo" }).getAttribute("href"),
      "https://unibuddyexperiment.vercel.app/",
    );
    assert.equal(
      await card.getByRole("link", { name: "GitHub" }).getAttribute("href"),
      "https://github.com/Shaaz-55/unibuddy_experiment",
    );
    console.log(
      `PASS ${question} — five decoded images, ${selected} selected, correct links`,
    );
  }
  const card = page.locator(".project-showcase").last();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await card
      .getByRole("button", {
        name: "Show UniBuddy Map screenshot",
        exact: true,
      })
      .click();
    await card
      .getByRole("button", { name: "Enlarge UniBuddy Map screenshot" })
      .click();
    assert.ok(await page.locator("dialog[open]").isVisible());
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: new URL(`showcase-${width}.png`, artifacts).pathname,
    });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    console.log(
      `PASS gallery selection, enlargement, Escape and ${width}px layout`,
    );
  }
  if (process.env.MP3_FIXTURE) {
    const mp3 = await readFile(process.env.MP3_FIXTURE);
    await page.route("**/api/tts", (route) =>
      route.fulfill({ status: 200, contentType: "audio/mpeg", body: mp3 }),
    );
    await page
      .getByRole("button", { name: "Play response 6", exact: true })
      .click();
    await page.waitForFunction(() => window.playedMp3 > 0);
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Stop speaking"]'),
    );
    assert.equal(await page.evaluate(() => window.nativeSpeechCalls), 0);
    console.log(
      "PASS real MP3 fixture decoded and played in Chrome; zero native TTS calls (not a live Fish generation test)",
    );
    await page.unroute("**/api/tts");
  }
  await page.route("**/api/tts", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: '{"error":"Test failure"}',
    }),
  );
  await page
    .getByRole("button", { name: "Play response 6", exact: true })
    .click();
  await page.locator(".audio-notice").waitFor();
  assert.match(
    await page.locator(".message-shaaz").last().innerText(),
    /LogiSense/,
  );
  assert.equal(await page.evaluate(() => window.nativeSpeechCalls), 0);
  console.log("PASS failed TTS retains text and gallery without native TTS");
  await page.route("**/assets/projects/unibuddy/messages.webp", (route) =>
    route.fulfill({ status: 404, body: "Missing test image" }),
  );
  await page.reload();
  await page.locator("#question-input").fill("Show me the messages interface.");
  await page.locator("#question-input").press("Enter");
  await page.locator(".project-preview .project-image-fallback").waitFor();
  console.log("PASS missing-image fallback");
  await page.close();
}
