const errorMessages = {
  "not-allowed":
    "Microphone permission was denied. Allow microphone access in your browser settings, or keep typing.",
  "service-not-allowed":
    "Your browser has blocked speech recognition. You can keep typing instead.",
  "audio-capture":
    "No microphone is available. Connect one and try again, or keep typing.",
  "no-speech": "No speech was recognised. Try again or type your question.",
  network:
    "The browser could not reach its speech service. Check your connection or keep typing.",
  "language-not-supported":
    "English speech recognition is unavailable in this browser. You can keep typing.",
};

// Each start owns one native session. Nothing requests permission until start().
// Replacement adapters expose supported and start(callbacks) => { stop, cancel }.
export function createBrowserRecognition(scope = globalThis) {
  const Recognition = scope.SpeechRecognition || scope.webkitSpeechRecognition;
  return {
    supported: Boolean(Recognition),
    start({ onStart, onResult, onEnd, onError, lang = "en-IN" }) {
      if (!Recognition)
        throw new Error(
          "Speech recognition is unavailable in this browser. You can type your question instead.",
        );
      const recognition = new Recognition();
      let active = true;
      let finalText = "";
      let finishTimer;
      let durationTimer;
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      const detach = () => {
        active = false;
        clearTimeout(finishTimer);
        clearTimeout(durationTimer);
        recognition.onstart =
          recognition.onresult =
          recognition.onerror =
          recognition.onend =
            null;
      };
      const abort = () => {
        try {
          recognition.abort();
        } catch {
          /* Already ended. */
        }
      };
      const finish = () => {
        if (!active) return;
        detach();
        abort();
        onEnd?.({ text: finalText });
      };
      const stop = () => {
        if (!active || finishTimer) return;
        clearTimeout(durationTimer);
        // Some implementations never emit end after stop. Release them anyway.
        finishTimer = setTimeout(finish, 2500);
        try {
          recognition.stop();
        } catch {
          finish();
        }
      };
      recognition.onstart = () => {
        if (!active) return;
        durationTimer = setTimeout(stop, 60000);
        onStart?.();
      };
      recognition.onresult = (event) => {
        if (!active) return;
        const final = [],
          interim = [];
        // Native results are cumulative; replacing the snapshot avoids duplicates.
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          (result.isFinal ? final : interim).push(result[0].transcript.trim());
        }
        finalText = final.join(" ");
        onResult?.({ final: finalText, interim: interim.join(" ") });
      };
      recognition.onerror = (event) => {
        if (!active) return;
        detach();
        abort();
        onError?.(
          new Error(
            errorMessages[event.error] ||
              "Speech recognition stopped unexpectedly. Try again or keep typing.",
          ),
        );
      };
      recognition.onend = finish;
      try {
        recognition.start();
      } catch (error) {
        detach();
        abort();
        throw error;
      }
      return {
        stop,
        cancel() {
          detach();
          abort();
        },
      };
    },
  };
}
