const MAX_TEXT_LENGTH = 5000;
const MAX_BODY_BYTES = 32768;

// Both Vercel and the Vite development server use this handler. Credentials stay here.
export function createTtsHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  return async function tts(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const fail = (status, error, upstreamStatus) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error,
          ...(upstreamStatus ? { upstreamStatus } : {}),
        }),
      );
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return fail(405, "Use POST to generate speech.");
    }
    if (!/^application\/json\b/i.test(req.headers?.["content-type"] || "")) {
      return fail(415, "Send a JSON request body.");
    }
    let body = req.body;
    try {
      if (body === undefined) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += Buffer.byteLength(chunk);
          if (size > MAX_BODY_BYTES)
            return fail(413, "Speech request is too large.");
          chunks.push(Buffer.from(chunk));
        }
        body = Buffer.concat(chunks).toString("utf8");
      }
      if (typeof body === "string" || Buffer.isBuffer(body))
        body = JSON.parse(body.toString());
    } catch {
      return fail(400, "Send valid JSON with a text field.");
    }
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > MAX_TEXT_LENGTH) {
      return fail(400, `Text must contain 1–${MAX_TEXT_LENGTH} characters.`);
    }
    const apiKey = env.FISH_API_KEY?.trim();
    const voiceId = env.FISH_VOICE_ID?.trim();
    if (!apiKey || !voiceId)
      return fail(503, "Cloned voice is not configured on the server.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const disconnect = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on?.("close", disconnect);
    try {
      const upstream = await fetchImpl("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          model: "s2.1-pro-free",
        },
        body: JSON.stringify({ text, reference_id: voiceId, format: "mp3" }),
        signal: controller.signal,
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        const message =
          upstream.status === 429
            ? "Cloned voice is busy. Please try again shortly."
            : [401, 403].includes(upstream.status)
              ? "Fish Audio rejected the server voice credentials."
              : "Fish Audio could not generate this response.";
        return fail(
          upstream.status === 429 ? 429 : 502,
          message,
          upstream.status,
        );
      }
      const audio = Buffer.from(await upstream.arrayBuffer());
      const mp3 =
        audio.length > 3 &&
        (audio.toString("ascii", 0, 3) === "ID3" ||
          (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0));
      if (!mp3)
        return fail(502, "Fish Audio returned invalid or empty MP3 audio.");
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = 200;
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", String(audio.length));
      res.end(audio);
    } catch {
      fail(
        controller.signal.aborted ? 504 : 502,
        controller.signal.aborted
          ? "Cloned voice generation timed out. Please try again."
          : "Fish Audio is temporarily unavailable.",
      );
    } finally {
      clearTimeout(timeout);
      res.off?.("close", disconnect);
    }
  };
}

export default createTtsHandler();
