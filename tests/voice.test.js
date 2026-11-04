import { test } from "node:test";
import assert from "node:assert/strict";
import { createBrowserRecognition } from "../src/services/browserRecognition.js";
import { createBrowserSynthesis } from "../src/services/browserSynthesis.js";
import { insertTranscript } from "../src/services/transcriptDraft.js";

function recognitionFixture(prefixed = false) {
  const calls = [];
  let native;
  class Recognition {
    constructor() {
      calls.push("construct");
      native = this;
    }
    start() {
      calls.push("start");
      this.onstart?.();
    }
    stop() {
      calls.push("stop");
    }
    abort() {
      calls.push("abort");
    }
  }
  return {
    calls,
    get native() {
      return native;
    },
    service: createBrowserRecognition({
      [prefixed ? "webkitSpeechRecognition" : "SpeechRecognition"]: Recognition,
    }),
  };
}
const result = (text, isFinal) =>
  Object.assign([{ transcript: text }], { isFinal });

for (const prefixed of [false, true])
  test(`Recognition ${prefixed ? "webkit" : "standard"} starts only on request and maintains cumulative results`, () => {
    const fixture = recognitionFixture(prefixed);
    const updates = [],
      finished = [];
    assert.equal(fixture.service.supported, true);
    assert.deepEqual(fixture.calls, []);
    const handle = fixture.service.start({
      onResult: (text) => updates.push(text),
      onEnd: (text) => finished.push(text),
    });
    assert.equal(fixture.native.interimResults, true);
    fixture.native.onresult({
      results: [result("Hello", true), result("wor", false)],
    });
    fixture.native.onresult({
      results: [result("Hello", true), result("world", true)],
    });
    assert.deepEqual(updates, [
      { final: "Hello", interim: "wor" },
      { final: "Hello world", interim: "" },
    ]);
    handle.stop();
    fixture.native.onend();
    assert.deepEqual(finished, [{ text: "Hello world" }]);
    assert.equal(fixture.native.onresult, null);
    assert.equal(fixture.calls.at(-1), "abort");
  });

test("Cancel detaches handlers and ignores late results and end events", () => {
  const fixture = recognitionFixture();
  let calls = 0;
  const handle = fixture.service.start({
    onResult: () => calls++,
    onEnd: () => calls++,
    onError: () => calls++,
  });
  const lateResult = fixture.native.onresult,
    lateEnd = fixture.native.onend;
  handle.cancel();
  lateResult({ results: [result("Must not be inserted", true)] });
  lateEnd();
  assert.equal(calls, 0);
  assert.equal(fixture.native.onerror, null);
});

test("Permission and capture errors release the microphone and offer text input", () => {
  for (const code of ["not-allowed", "audio-capture", "no-speech", "network"]) {
    const fixture = recognitionFixture();
    let error;
    fixture.service.start({
      onError: (value) => {
        error = value;
      },
    });
    fixture.native.onerror({ error: code });
    assert.match(error.message, /typ/i);
    assert.equal(fixture.calls.at(-1), "abort");
    assert.equal(fixture.native.onend, null);
  }
});

test("Stop has a timeout when native recognition fails to emit end", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fixture = recognitionFixture();
  let text;
  const handle = fixture.service.start({
    onEnd: (value) => {
      text = value.text;
    },
  });
  fixture.native.onresult({
    results: [result("Keep this", true), result("partial", false)],
  });
  handle.stop();
  t.mock.timers.tick(2501);
  assert.equal(text, "Keep this");
  assert.equal(fixture.calls.at(-1), "abort");
});

test("Recording has a maximum lifetime and releases stalled sessions", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fixture = recognitionFixture();
  fixture.service.start({});
  t.mock.timers.tick(60001);
  assert.ok(fixture.calls.includes("stop"));
  t.mock.timers.tick(2501);
  assert.equal(fixture.calls.at(-1), "abort");
});

test("Unsupported and throwing recognition implementations fail without leaking callbacks", () => {
  const unsupported = createBrowserRecognition({});
  assert.equal(unsupported.supported, false);
  assert.throws(() => unsupported.start({}), /type your question/);
  let native;
  const service = createBrowserRecognition({
    SpeechRecognition: class {
      constructor() {
        native = this;
      }
      start() {
        throw new Error("Browser blocked microphone");
      }
      abort() {
        this.aborted = true;
      }
    },
  });
  assert.throws(() => service.start({}), /blocked/);
  assert.equal(native.aborted, true);
  assert.equal(native.onresult, null);
});

test("Speech draft preserves surrounding text and respects the input limit", () => {
  assert.deepEqual(
    insertTranscript(
      { value: "Ask about old projects", start: 10, end: 13 },
      "new",
      500,
    ),
    { value: "Ask about new projects", caret: 13, truncated: false },
  );
  assert.equal(
    insertTranscript({ value: "Hello", start: 5, end: 5 }, "world", 500).value,
    "Hello world",
  );
  const clipped = insertTranscript(
    { value: "x".repeat(495), start: 495, end: 495 },
    "long answer",
    500,
  );
  assert.equal(clipped.value.length, 500);
  assert.equal(clipped.truncated, true);
  assert.equal(
    insertTranscript(
      { value: "My suffix", start: 3, end: 3 },
      "a long question",
      15,
    ).value.endsWith("suffix"),
    true,
  );
});

test("Synthesis is explicitly started, chooses a normal voice and cleans up on stop", () => {
  const calls = [];
  let utterance;
  const voice = { name: "English India", lang: "en-IN" };
  const service = createBrowserSynthesis({
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      cancel() {
        calls.push("cancel");
      },
      getVoices() {
        return [voice];
      },
      speak(value) {
        utterance = value;
        calls.push(value.text);
      },
    },
  });
  assert.deepEqual(calls, []);
  let started = 0,
    ended = 0;
  const handle = service.speak("A visible answer", {
    onStart: () => started++,
    onEnd: () => ended++,
  });
  assert.deepEqual(calls, ["cancel", "A visible answer"]);
  assert.equal(utterance.voice, voice);
  assert.equal(utterance.rate, 1);
  utterance.onstart();
  assert.equal(started, 1);
  const lateEnd = utterance.onend;
  handle.stop();
  lateEnd();
  assert.equal(ended, 0);
  assert.equal(utterance.onstart, null);
  assert.equal(calls.at(-1), "cancel");
});

test("Synthesis reports errors and unsupported browsers without hiding text", () => {
  assert.equal(createBrowserSynthesis({}).supported, false);
  assert.throws(
    () => createBrowserSynthesis({}).speak("hello", {}),
    /available as text/,
  );
  let utterance, error;
  const service = createBrowserSynthesis({
    SpeechSynthesisUtterance: class {},
    speechSynthesis: {
      getVoices: () => [],
      cancel() {},
      speak(value) {
        utterance = value;
      },
    },
  });
  service.speak("hello", {
    onError: (value) => {
      error = value;
    },
  });
  utterance.onerror({ error: "synthesis-failed" });
  assert.match(error.message, /full answer/);
  assert.equal(utterance.onend, null);
});
