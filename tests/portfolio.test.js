import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { portfolioData, archiveSections } from "../src/data/portfolioData.js";
import { interviewCategories } from "../src/data/interviewQuestions.js";
import { findResponse } from "../src/services/mockConversationService.js";

test("All 32 requested interview questions resolve with or without prior project context", () => {
  const topics = [
    ["identity", "identity", "strengths", "strengths", "learning"],
    ["selection", "roleInterest", "motivation", "ambitions", "motivation"],
    [
      "featured",
      "unibuddy",
      "sehat",
      "y-pay",
      "voice-controlled",
      "challenge",
      "debugging",
      "technologyChoice",
      "testing",
      "projectImprovement",
    ],
    [
      "challenge",
      "teamwork",
      "disagreement",
      "failure",
      "deadlines",
      "initiative",
      "feedback",
    ],
    [
      "ideaToProduct",
      "prioritisation",
      "productImprovement",
      "requirements",
      "solutionFailure",
    ],
  ];
  assert.equal(
    interviewCategories.flatMap((category) => category.questions).length,
    32,
  );
  for (const [index, category] of interviewCategories.entries()) {
    for (const [questionIndex, question] of category.questions.entries()) {
      for (const context of [
        undefined,
        { projectId: "y-pay", topic: "y-pay" },
      ]) {
        const answer = findResponse(question, context);
        assert.equal(answer.topic, topics[index][questionIndex], question);
        assert.ok(answer.content.length > 40, question);
        assert.doesNotMatch(answer.content, /undefined|\/assets\//, question);
      }
    }
  }
});

test("Unknown experiences, role details, and Y-Pay implementation are disclosed", () => {
  for (const question of [
    "Tell me about a mistake you made and what you learned.",
    "Have you ever taken initiative without being asked?",
    "What awards have you won?",
    "What technologies does Y-Pay use?",
    "How does Y-Pay work?",
    "What did you learn from Y-Pay?",
  ]) {
    assert.match(
      findResponse(question).content,
      /haven't|isn't currently|isn't supplied|not.*documented/i,
      question,
    );
  }
  assert.match(
    findResponse("Why are you interested in this role?").content,
    /don't have this role's description/,
  );
  assert.match(
    findResponse("Describe a time you worked in a team.").content,
    /Vibeathon.*Polaris.*Replit/,
  );
  assert.match(
    findResponse("How would you improve an existing product?").content,
    /propose.*UniBuddy|UniBuddy.*propose/,
  );
});

test("Every retained project reaches the showcase, including projects without screenshots", () => {
  const expected = [
    "unibuddy",
    "waste",
    "logisense",
    "sehat",
    "voice-controlled",
    "y-pay",
  ];
  assert.deepEqual(
    portfolioData.projects.map((project) => project.id),
    expected,
  );
  const collection = findResponse("Show me all projects");
  assert.deepEqual(
    collection.projects.map((project) => project.id),
    expected,
  );
  for (const project of portfolioData.projects) {
    const answer = findResponse(`Explain ${project.name}`);
    assert.equal(answer.topic, project.id);
    assert.equal(answer.projects.length, 1);
    assert.equal(answer.projects[0].description, project.description);
    assert.ok(Array.isArray(answer.projects[0].images));
    assert.ok(Array.isArray(answer.projects[0].technologies));
    assert.equal(typeof project.liveDemoUrl, "string");
    assert.equal(typeof project.githubUrl, "string");
  }
  assert.equal(
    findResponse("Which project are you most proud of?").projects[0].id,
    "waste",
  );
  assert.deepEqual(
    findResponse("Compare UniBuddy and Y-Pay").projects.map(
      (project) => project.id,
    ),
    ["unibuddy", "y-pay"],
  );
  assert.doesNotMatch(
    JSON.stringify({
      portfolioData: {
        ...portfolioData,
        leadership: undefined,
      },
      archiveSections,
      interviewCategories,
      collection,
    }),
    /safesteps|safe steps|parsley|aayam fest|aayam techfest website/i,
  );
  for (const removed of ["SafeSteps", "Parsley Clone", "AAYAM Fest", "AAYAM Techfest Website"]) {
    const answer = findResponse(`Tell me about ${removed}`);
    assert.equal(answer.topic, "fallback");
    assert.deepEqual(answer.projects, []);
    assert.doesNotMatch(answer.content, /safesteps|parsley|aayam/i);
  }
});

test("Project follow-ups, screenshots, and repository links stay with the requested project", () => {
  for (const [question, id, imageId] of [
    ["Show me Sehat reviews", "sehat", "reviews"],
    ["Show me Y-Pay wallet", "y-pay", "wallet"],
    ["Show me the UniBuddy dashboard", "unibuddy", "dashboard"],
    ["Explain Voice Controlled", "voice-controlled", "cover"],
  ]) {
    const first = findResponse(question);
    assert.equal(first.projects[0].selectedImage, imageId);
    assert.equal(findResponse("Tell me more", first.context).topic, id);
    assert.equal(findResponse("How did you test it?", first.context).topic, id);
    const links = findResponse("Show me its GitHub repository", first.context);
    assert.equal(links.topic, id);
    assert.equal(links.aspect, "links");
    assert.ok(
      !links.links.some((link) => link.href === portfolioData.contact.github),
    );
  }
  const ypay = findResponse("Tell me about Y-Pay");
  assert.equal(
    findResponse("Show me the wallet", ypay.context).projects[0].selectedImage,
    "wallet",
  );
  assert.equal(
    findResponse("Show me your GitHub", ypay.context).topic,
    "github",
  );
  assert.equal(findResponse("Show me Sehat's GitHub").topic, "sehat");
  const stale = findResponse("How does it work?", {
    projectId: "removed-project",
    topic: null,
  });
  assert.equal(stale.topic, "clarifyProject");
});

test("All 13 referenced screenshots and the resume are real files; pending images aren't rendered", () => {
  const counts = { unibuddy: 5, sehat: 4, "voice-controlled": 1, "y-pay": 3 };
  let total = 0;
  for (const project of portfolioData.projects) {
    assert.equal(project.images.length, counts[project.id] || 0);
    for (const image of project.images) {
      assert.ok(image.alt && image.label);
      const bytes = readFileSync(
        new URL(`../public${image.src}`, import.meta.url),
      );
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      total++;
    }
    for (const missing of project.pendingImages || []) {
      assert.equal(
        existsSync(new URL(`../public${missing}`, import.meta.url)),
        false,
      );
      assert.ok(!project.images.some((image) => image.src === missing));
    }
  }
  assert.equal(total, 13);
  const resume = readFileSync(
    new URL(`../public${portfolioData.resume.url}`, import.meta.url),
  );
  assert.equal(resume.toString("ascii", 0, 5), "%PDF-");
  assert.equal(
    archiveSections.find((section) => section.id === "resume").href,
    portfolioData.resume.url,
  );
  const answer = findResponse("Can I download your resume?");
  assert.equal(answer.topic, "resume");
  assert.equal(answer.links.length, 2);
  assert.equal(answer.links[1].download, portfolioData.resume.filename);
  assert.doesNotMatch(answer.content, /\/assets\//);
});
