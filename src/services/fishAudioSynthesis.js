const PLAYBACK_ERROR =
  "Cloned voice playback failed. The full answer is still available as text.";

export function createFishAudioSynthesis(scope = globalThis) {
  let currentStop;
  const supported = Boolean(
    scope.fetch &&
    scope.Audio &&
    scope.Blob &&
    scope.AbortController &&
    scope.URL?.createObjectURL &&
    scope.URL?.revokeObjectURL,
  );
  return {
    supported,
    speak(text, { onStart, onEnd, onError } = {}) {
      if (!supported)
        throw new Error(
          "Voice playback is unavailable in this browser. The answer is available as text.",
        );
      currentStop?.();
      const controller = new scope.AbortController();
      let active = true;
      let audio;
      let objectUrl;
      let started = false;
      const stop = () => {
        if (!active) return;
        active = false;
        controller.abort();
        if (audio) {
          audio.onplaying = audio.onended = audio.onerror = null;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        }
        if (objectUrl) {
          scope.URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        if (currentStop === stop) currentStop = null;
      };
      const finish = (error) => {
        if (!active) return;
        stop();
        if (error) onError?.(error);
        else onEnd?.();
      };
      currentStop = stop;
      (async () => {
        try {
          const response = await scope.fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: controller.signal,
          });
          if (!active) return;
          if (!response.ok)
            throw new Error(
              response.status === 429
                ? "Cloned voice is busy. Please try again shortly; the full answer is still available as text."
                : "Cloned voice is unavailable. Please try again; the full answer is still available as text.",
            );
          if (
            !/^audio\/mpeg\b/i.test(response.headers.get("content-type") || "")
          )
            throw new Error(PLAYBACK_ERROR);
          const bytes = await response.arrayBuffer();
          if (!active) return;
          if (!bytes.byteLength) throw new Error(PLAYBACK_ERROR);
          const blob = new scope.Blob([bytes], { type: "audio/mpeg" });
          objectUrl = scope.URL.createObjectURL(blob);
          audio = new scope.Audio(objectUrl);
          audio.onplaying = () => {
            if (active && !started) {
              started = true;
              onStart?.();
            }
          };
          audio.onended = () => finish();
          audio.onerror = () => finish(new Error(PLAYBACK_ERROR));
          await audio.play();
        } catch (error) {
          if (active)
            finish(
              new Error(
                error.name === "NotAllowedError"
                  ? "Your browser blocked audio. Tap Listen to response to retry; the full answer is still available as text."
                  : error.name === "TypeError"
                    ? "Cloned voice could not be loaded. Please try again; the full answer is still available as text."
                    : error.message || PLAYBACK_ERROR,
              ),
            );
        }
      })();
      return { stop };
    },
  };
}
