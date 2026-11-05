import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { portfolioData, archiveSections } from "../src/data/portfolioData.js";
import { interviewCategories } from "../src/data/interviewQuestions.js";

export async function verifyPortfolio({
  browser,
  check,
  appUrl,
  artifacts,
  consoleErrors,
}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("shaaz-booted", "1"));
  const ask = async (question) => {
    await page.locator("#question-input").fill(question);
    await page.locator("#question-input").press("Enter");
    await page.waitForFunction(
      () => !document.querySelector("#question-input").readOnly,
    );
    return page.locator(".message-shaaz").last();
  };
  try {
    await page.goto(appUrl, { waitUntil: "networkidle" });
    await check(
      "All interview categories are browsable and submit their questions",
      async () => {
        assert.equal(await page.locator(".suggestions .suggestion").count(), 4);
        for (const category of interviewCategories) {
          await page
            .getByRole("button", { name: "Browse interview questions" })
            .click();
          const dialog = page.getByRole("dialog", {
            name: "Interview archive",
            exact: true,
          });
          await dialog
            .getByRole("button", { name: category.label, exact: true })
            .click();
          assert.equal(
            await dialog.locator(".interview-question-list button").count(),
            category.questions.length,
          );
          const question = category.questions[0];
          await dialog
            .getByRole("button", { name: question, exact: true })
            .click();
          await page.waitForFunction(
            () => !document.querySelector("#question-input").readOnly,
          );
          assert.equal(await page.locator("dialog[open]").count(), 0);
          assert.equal(
            await page.locator(".message-visitor > p").last().innerText(),
            question,
          );
          assert.doesNotMatch(
            await page.locator(".message-shaaz > p").last().innerText(),
            /I don't have a verified answer/,
          );
        }
      },
    );

    await check(
      "Every project renders a card and all 13 supplied screenshots decode",
      async () => {
        const answer = await ask("Show me all projects");
        const cards = answer.locator(".project-showcase");
        assert.deepEqual(
          await cards.locator("h3").allTextContents(),
          portfolioData.projects.map((project) => project.name),
        );
        assert.doesNotMatch(await answer.innerText(), /SafeSteps|Parsley/i);
        for (const project of portfolioData.projects) {
          const card = answer.getByRole("region", {
            name: `${project.name} project showcase`,
            exact: true,
          });
          const images = card.locator("img");
          await images.evaluateAll((images) =>
            Promise.all(images.map((image) => image.decode())),
          );
          assert.equal(
            await card.locator(".project-preview").count(),
            project.images.length ? 1 : 0,
          );
          assert.equal(
            await card.locator(".project-thumbnails button").count(),
            project.images.length > 1 ? project.images.length : 0,
          );
          assert.equal(
            await card.locator(".project-technologies li").count(),
            project.technologies.length,
          );
          for (const [label, url] of [
            ["Live Demo", project.liveDemoUrl],
            ["GitHub", project.githubUrl],
          ]) {
            const link = card.getByRole("link", { name: label });
            assert.equal(await link.count(), url ? 1 : 0);
            if (url) assert.equal(await link.getAttribute("href"), url);
          }
        }
        const columns = await answer
          .locator(".project-collection")
          .evaluate(
            (node) =>
              getComputedStyle(node).gridTemplateColumns.split(" ").length,
          );
        assert.ok(
          columns >= 2,
          "Desktop project collection should have multiple columns",
        );
        await page.screenshot({
          path: new URL("projects-collection-desktop.png", artifacts).pathname,
        });
      },
    );

    await check(
      "New project galleries support selection, enlargement and contextual follow-ups",
      async () => {
        for (const id of ["sehat", "voice-controlled", "y-pay"]) {
          const project = portfolioData.projects.find(
            (project) => project.id === id,
          );
          const answer = await ask(`Explain ${project.name}`);
          const card = answer.getByRole("region", {
            name: `${project.name} project showcase`,
            exact: true,
          });
          const image = project.images.at(-1);
          if (project.images.length > 1)
            await card
              .getByRole("button", {
                name: `Show ${project.name} ${image.label} screenshot`,
                exact: true,
              })
              .click();
          await card
            .getByRole("button", {
              name: `Enlarge ${project.name} ${image.label} screenshot`,
              exact: true,
            })
            .click();
          const dialog = page.locator("dialog[open]");
          assert.equal(
            await dialog.locator("img").getAttribute("src"),
            image.src,
          );
          await dialog.locator("img").evaluate((image) => image.decode());
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("dialog[open]").count(), 0);
          const followUp = await ask("What technology does it use?");
          assert.equal(
            await followUp.locator(".project-showcase h3").innerText(),
            project.name,
          );
          if (id === "y-pay")
            assert.match(
              await followUp.locator(":scope > p").innerText(),
              /isn't currently documented/,
            );
        }
      },
    );

    await check(
      "Resume opens the actual PDF in a new tab and downloads accessibly",
      async () => {
        const nav = page.getByRole("navigation", { name: "Portfolio archive" });
        assert.equal(await nav.locator(".module-link").count(), 8);
        for (const section of archiveSections.filter(
          (section) => section.question,
        )) {
          assert.equal(
            await nav
              .getByRole("button", {
                name:
                  section.id === "leadership" ? "Leadership" : section.label,
                exact: true,
              })
              .count(),
            1,
          );
        }
        const expected = await readFile(
          new URL(`../public${portfolioData.resume.url}`, import.meta.url),
        );
        const response = await page.request.get(
          new URL(portfolioData.resume.url, appUrl).href,
        );
        assert.equal(response.status(), 200);
        assert.match(response.headers()["content-type"], /application\/pdf/);
        assert.deepEqual(await response.body(), expected);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const link = nav.getByRole("link", {
            name: "Resume (PDF, opens in a new tab)",
            exact: true,
          });
          assert.equal(await link.getAttribute("target"), "_blank");
          const popupPromise = page.waitForEvent("popup");
          await link.click();
          const popup = await popupPromise;
          await popup.waitForLoadState("domcontentloaded");
          assert.equal(
            popup.url(),
            new URL(portfolioData.resume.url, appUrl).href,
          );
          await popup.close();
        }
        const answer = await ask("Can I download your resume?");
        const downloadPromise = page.waitForEvent("download");
        await answer.getByRole("link", { name: "Download resume" }).click();
        const download = await downloadPromise;
        assert.equal(
          download.suggestedFilename(),
          portfolioData.resume.filename,
        );
        assert.deepEqual(await readFile(await download.path()), expected);
      },
    );

    for (const [width, height] of [
      [1920, 1080],
      [1366, 768],
      [1280, 720],
      [1100, 700],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 740],
    ]) {
      await check(
        `Refined controls, project collection and interview dialog at ${width}×${height}`,
        async () => {
          await page.setViewportSize({ width, height });
          const answer = await ask("Show me all projects");
          const dimensions = await page.evaluate(() => {
            const bounds = (selector) =>
              document.querySelector(selector).getBoundingClientRect().toJSON();
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              mic: bounds(".mic-button"),
              send: bounds(".submit-button"),
              micRadius: getComputedStyle(document.querySelector(".mic-button"))
                .borderRadius,
              sendRadius: getComputedStyle(
                document.querySelector(".submit-button"),
              ).borderRadius,
              left: bounds(".side-left"),
              main: bounds(".monitor-assembly"),
              right: bounds(".side-right"),
            };
          });
          assert.equal(dimensions.overflow, false);
          assert.ok(
            Math.abs(dimensions.mic.height - dimensions.send.height) <= 1,
          );
          assert.equal(dimensions.micRadius, dimensions.sendRadius);
          if (width >= 1100) {
            assert.ok(
              dimensions.left.right < dimensions.main.left,
              "Left monitor overlaps CRT",
            );
            assert.ok(
              dimensions.main.right < dimensions.right.left,
              "Right monitor overlaps CRT",
            );
          }
          if (width <= 390) {
            const columns = await answer
              .locator(".project-collection")
              .evaluate(
                (node) =>
                  getComputedStyle(node).gridTemplateColumns.split(" ").length,
              );
            assert.equal(columns, 1);
          }
          const trigger = page.getByRole("button", {
            name: "Browse interview questions",
          });
          await trigger.click();
          const dialog = page.getByRole("dialog", {
            name: "Interview archive",
            exact: true,
          });
          await dialog
            .getByRole("button", { name: "Projects & technology", exact: true })
            .click();
          const box = await dialog.boundingBox();
          assert.ok(
            box.x >= 0 &&
              box.y >= 0 &&
              box.x + box.width <= width &&
              box.y + box.height <= height,
          );
          await dialog
            .getByRole("button", {
              name: interviewCategories[2].questions.at(-1),
              exact: true,
            })
            .scrollIntoViewIfNeeded();
          if ([1366, 390].includes(width))
            await page.screenshot({
              path: new URL(`interview-directory-${width}.png`, artifacts)
                .pathname,
            });
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("dialog[open]").count(), 0);
          assert.equal(
            await trigger.evaluate((node) => document.activeElement === node),
            true,
          );
        },
      );
    }
  } finally {
    await page.close();
  }
}
