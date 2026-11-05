import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Uses the configured server credentials. No credentials are read or printed here.
const base = process.argv[2] || "http://127.0.0.1:5173";
const response = await fetch(new URL("/api/tts", base), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Hi, I'm Shaaz. Welcome to my portfolio." }),
});
assert.equal(
  response.status,
  200,
  `TTS returned HTTP ${response.status}; check server credentials and Fish Audio availability.`,
);
assert.match(response.headers.get("content-type"), /^audio\/mpeg/);
const bytes = Buffer.from(await response.arrayBuffer());
assert.ok(
  bytes.length > 3 &&
    (bytes.toString("ascii", 0, 3) === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224)),
  "Expected MP3 data",
);
await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../artifacts/fish-audio-test.mp3", import.meta.url),
  bytes,
);
console.log(
  `HTTP 200; audio/mpeg; ${bytes.length} bytes. Saved artifacts/fish-audio-test.mp3. Listen and compare with the same voice and s2.1-pro-free model in Fish Audio Playground.`,
);
