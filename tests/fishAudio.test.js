import { test } from "node:test";
import assert from "node:assert/strict";
import { createTtsHandler } from "../api/tts.js";
import { createFishAudioSynthesis } from "../src/services/fishAudioSynthesis.js";
import { findResponse } from "../src/services/mockConversationService.js";
import { portfolioData } from "../src/data/portfolioData.js";
import { readFileSync } from "node:fs";

const env = { FISH_API_KEY: "test-only-key", FISH_VOICE_ID: "test-only-clone" };
const mp3 = Buffer.from([0x49, 0x44, 0x33, 0, 1, 2, 3]);
async function request(options = {}) {
  const res = {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
  };
  await createTtsHandler({
    env,
    fetchImpl: async () => new Response(mp3),
    ...options,
  })(
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { text: "Hi, I'm Shaaz. Welcome to my portfolio." },
      ...options.req,
    },
    res,
  );
  return res;
}
test("Fish endpoint sends the server clone ID and model header and returns binary MP3", async () => {
  const res = await request({
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.fish.audio/v1/tts");
      assert.equal(options.headers.model, "s2.1-pro-free");
      assert.equal(options.headers.Authorization, "Bearer test-only-key");
      assert.deepEqual(JSON.parse(options.body), {
        text: "Hi, I'm Shaaz. Welcome to my portfolio.",
        reference_id: env.FISH_VOICE_ID,
        format: "mp3",
      });
      return new Response(mp3, { headers: { "content-type": "audio/mpeg" } });
    },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "audio/mpeg");
  assert.deepEqual(res.body, mp3);
});
test("Fish endpoint rejects invalid inputs and missing credentials before contacting Fish", async () => {
  for (const [options, status] of [
    [{ req: { method: "GET" } }, 405],
    [{ req: { headers: { "content-type": "text/plain" } } }, 415],
    [{ req: { body: "{" } }, 400],
    [{ req: { body: { text: " " } } }, 400],
    [{ req: { body: { text: "x".repeat(5001) } } }, 400],
    [{ env: {} }, 503],
  ]) {
    const res = await request({
      ...options,
      fetchImpl: () => assert.fail("Unexpected upstream request"),
    });
    assert.equal(res.statusCode, status);
  }
});
test("Fish errors, network failures, and non-audio responses never expose provider details", async () => {
  for (const [fetchImpl, status] of [
    [async () => new Response("secret upstream details", { status: 401 }), 502],
    [async () => new Response("quota", { status: 429 }), 429],
    [async () => new Response("not audio"), 502],
    [async () => new Response(new Uint8Array()), 502],
    [
      async () => {
        throw new Error("secret network details");
      },
      502,
    ],
  ]) {
    const res = await request({ fetchImpl });
    assert.equal(res.statusCode, status);
    assert.doesNotMatch(res.body, /secret|test-only/);
  }
});

function playerFixture(
  fetchImpl = async () =>
    new Response(mp3, { headers: { "content-type": "audio/mpeg" } }),
  { playError } = {},
) {
  const calls = [];
  let audio;
  const service = createFishAudioSynthesis({
    Blob,
    AbortController,
    fetch: fetchImpl,
    URL: {
      createObjectURL(blob) {
        calls.push(["blob", blob.type, blob.size]);
        return "blob:test";
      },
      revokeObjectURL(url) {
        calls.push(["revoke", url]);
      },
    },
    Audio: class {
      constructor(url) {
        audio = this;
        calls.push(["audio", url]);
      }
      play() {
        if (playError) return Promise.reject(playError);
        this.onplaying();
        return Promise.resolve();
      }
      pause() {
        calls.push(["pause"]);
      }
      removeAttribute() {}
      load() {}
    },
  });
  return {
    service,
    calls,
    get audio() {
      return audio;
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test("Fish playback starts on HTML Audio events and releases the URL on completion", async () => {
  const player = playerFixture();
  const events = [];
  player.service.speak("Visible answer", {
    onStart: () => events.push("start"),
    onEnd: () => events.push("end"),
  });
  await settle();
  assert.deepEqual(events, ["start"]);
  player.audio.onended();
  assert.deepEqual(events, ["start", "end"]);
  assert.equal(player.audio.onplaying, null);
  assert.ok(player.calls.some((call) => call[0] === "revoke"));
});
test("Stopping an in-flight Fish request aborts it and suppresses late playback", async () => {
  let resolve, signal;
  const player = playerFixture((url, options) => {
    signal = options.signal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const handle = player.service.speak("Cancelled", {
    onStart: () => assert.fail("Late start"),
    onError: () => assert.fail("Late error"),
  });
  handle.stop();
  assert.equal(signal.aborted, true);
  resolve(new Response(mp3, { headers: { "content-type": "audio/mpeg" } }));
  await settle();
  assert.deepEqual(player.calls, []);
});
test("Fish failures leave a text-friendly error and no audio instance", async () => {
  for (const response of [
    new Response("failure", { status: 502 }),
    new Response("HTML", { headers: { "content-type": "text/html" } }),
  ]) {
    const player = playerFixture(async () => response);
    let error;
    player.service.speak("Visible answer", {
      onError: (value) => {
        error = value;
      },
    });
    await settle();
    assert.match(error.message, /full answer.*text/);
    assert.equal(player.audio, undefined);
  }
});
test("Stopping or replacing audio releases it once and ignores late media events", async () => {
  const player = playerFixture();
  const events = [];
  const first = player.service.speak("First answer", {
    onEnd: () => events.push("end"),
    onError: () => events.push("error"),
  });
  await settle();
  const staleEnd = player.audio.onended;
  player.service.speak("Second answer");
  await settle();
  assert.equal(player.calls.filter((call) => call[0] === "revoke").length, 1);
  staleEnd();
  first.stop();
  assert.deepEqual(events, []);
  assert.equal(player.calls.filter((call) => call[0] === "revoke").length, 1);
  player.audio.onended();
  assert.equal(player.calls.filter((call) => call[0] === "revoke").length, 2);
});
test("Autoplay rejection and network failure return useful errors without native speech", async () => {
  const blocked = playerFixture(undefined, {
    playError: new DOMException("Blocked", "NotAllowedError"),
  });
  let error;
  blocked.service.speak("Visible answer", {
    onError: (value) => {
      error = value;
    },
  });
  await settle();
  assert.match(error.message, /Tap Listen to response to retry/);
  assert.ok(blocked.calls.some((call) => call[0] === "revoke"));
  const network = playerFixture(async () => {
    throw new TypeError("Network details");
  });
  network.service.speak("Visible answer", {
    onError: (value) => {
      error = value;
    },
  });
  await settle();
  assert.match(error.message, /full answer.*text/);
  assert.doesNotMatch(error.message, /Network details/);
  assert.equal(network.audio, undefined);
});
test("Vite request streams are parsed and oversized or malformed bodies are rejected", async () => {
  for (const [body, status] of [
    [JSON.stringify({ text: "A streamed request" }), 200],
    ["{", 400],
    ["x".repeat(32769), 413],
  ]) {
    const res = await request({
      req: {
        body: undefined,
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(body);
        },
      },
    });
    assert.equal(res.statusCode, status);
  }
});
test("Fish timeouts fail with JSON and cancel the upstream request", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let aborted = false;
  const pending = request({
    fetchImpl: (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Timed out", "AbortError"));
        });
      }),
  });
  context.mock.timers.tick(45000);
  const res = await pending;
  assert.equal(aborted, true);
  assert.equal(res.statusCode, 504);
  assert.equal(res.headers["Content-Type"], "application/json");
  assert.match(res.body, /timed out/);
});
test("UniBuddy questions carry all five real screenshots and the requested selection", () => {
  const questions = [
    ["Tell me about UniBuddy.", "cover"],
    ["Show me UniBuddy.", "cover"],
    ["Show me the dashboard.", "dashboard"],
    ["Show me the map.", "map"],
    ["Show me the map feature.", "map"],
    ["Show me the messages interface.", "messages"],
    ["Show me the mobile version.", "mobile"],
    ["How does UniBuddy work?", "cover"],
  ];
  for (const [question, selected] of questions) {
    const answer = findResponse(question);
    assert.equal(answer.projects.length, 1, question);
    assert.equal(answer.projects[0].selectedImage, selected, question);
    assert.equal(answer.projects[0].images.length, 5);
    assert.doesNotMatch(answer.content, /\/assets\//);
  }
  const all = findResponse("Show me all my projects.");
  assert.equal(all.projects.length, portfolioData.projects.length);
  assert.ok(all.projects.some((project) => project.id === "logisense"));
  const project = portfolioData.projects.find(
    (project) => project.id === "unibuddy",
  );
  for (const image of project.images) {
    const bytes = readFileSync(
      new URL(`../public${image.src}`, import.meta.url),
    );
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  }
});
