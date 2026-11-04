// A future backend/audio adapter implements this same per-playback contract.
// UI and avatar never need to know the provider, voice ID, or audio transport.
export function createBrowserSynthesis(scope = globalThis) {
  const synth = scope.speechSynthesis;
  const Utterance = scope.SpeechSynthesisUtterance;
  return {
    supported: Boolean(synth && Utterance),
    speak(text, { onStart, onEnd, onError }) {
      if (!synth || !Utterance)
        throw new Error(
          "Voice playback is unavailable in this browser. The answer is available as text.",
        );
      synth.cancel();
      const utterance = new Utterance(text);
      const voices = synth.getVoices();
      utterance.voice =
        voices.find((voice) => /^en[-_]IN$/i.test(voice.lang)) ||
        voices.find(
          (voice) => /^en\b/i.test(voice.lang) && voice.localService,
        ) ||
        voices.find((voice) => /^en\b/i.test(voice.lang)) ||
        null;
      utterance.lang = utterance.voice?.lang || "en-IN";
      utterance.rate = 1;
      utterance.pitch = 1;
      let active = true;
      const detach = () => {
        active = false;
        utterance.onstart = utterance.onend = utterance.onerror = null;
      };
      utterance.onstart = () => {
        if (active) onStart?.();
      };
      utterance.onend = () => {
        if (active) {
          detach();
          onEnd?.();
        }
      };
      utterance.onerror = (event) => {
        if (!active) return;
        detach();
        if (event.error === "canceled" || event.error === "interrupted")
          onEnd?.();
        else
          onError?.(
            new Error(
              "Voice playback failed. The full answer is still available as text.",
            ),
          );
      };
      try {
        synth.speak(utterance);
      } catch (error) {
        detach();
        synth.cancel();
        throw error;
      }
      return {
        stop() {
          detach();
          synth.cancel();
        },
      };
    },
  };
}
