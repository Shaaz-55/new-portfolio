import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findResponse,
  conversationService,
} from "../src/services/mockConversationService.js";

test("All required sample topics resolve to intentional local answers", () => {
  const cases = [
    ["Who are you?", "identity"],
    ["What are you studying?", "study"],
    ["Tell me about UniBuddy / PeerHub", "unibuddy"],
    ["Tell me about SafeSteps", "safesteps"],
    ["What is LogiSense?", "logisense"],
    ["Tell me about your robotics projects", "robotics"],
    ["What are your technical skills?", "skills"],
    ["What kind of problems do you enjoy solving?", "motivation"],
    ["What are your career ambitions?", "ambitions"],
    ["Why should we select you?", "selection"],
    ["What makes you different?", "selection"],
    ["What are you currently learning?", "learning"],
    ["What is your biggest strength?", "selection"],
    ["Tell me about a challenge you faced", "challenge"],
    ["What would you do with a ₹3,000 competition budget?", "budget"],
  ];
  for (const [question, topic] of cases) {
    const answer = findResponse(question);
    assert.equal(answer.topic, topic, question);
    assert.equal(answer.source, "local-demo");
    assert.ok(answer.content.length > 30);
  }
});
test("Unknown questions and missing personal data are disclosed honestly", () => {
  assert.equal(findResponse("What is the weather tomorrow?").topic, "fallback");
  assert.match(findResponse("Your internship experience?").content, /verified/);
  assert.match(findResponse("How can I contact you?").content, /not published/);
  assert.equal(
    findResponse("this is a shipping question").topic,
    "fallback",
    "greetings must match whole words",
  );
});
test("A cancelled request cannot leak a late response", async () => {
  const controller = new AbortController();
  const request = conversationService.reply("Who are you?", {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
});
test("Service rejects empty and oversized input", async () => {
  await assert.rejects(conversationService.reply("   "), /enter a question/);
  await assert.rejects(
    conversationService.reply("x".repeat(501)),
    /500 characters/,
  );
});
