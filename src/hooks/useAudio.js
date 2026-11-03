import { useCallback, useEffect, useRef, useState } from "react";

export function useAudio() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const context = useRef(null);
  const speech = useRef(null);
  const enabledRef = useRef(false);
  const stop = useCallback(() => {
    if (speech.current) {
      speech.current.onend = null;
      speech.current.onerror = null;
      speech.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const tone = useCallback((kind = "key") => {
    if (
      !enabledRef.current ||
      !context.current ||
      context.current.state !== "running"
    )
      return;
    const audio = context.current;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      kind === "submit" ? 480 : 180,
      audio.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "submit" ? 720 : 70,
      audio.currentTime + 0.055,
    );
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.065);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.07);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }, []);

  const toggle = async () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setNotice("");
    if (!next) {
      stop();
      return;
    }
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass && !context.current) context.current = new AudioClass();
      if (context.current?.state === "suspended")
        await context.current.resume();
      tone("submit");
      if (!window.speechSynthesis)
        setNotice(
          "Voice is unavailable in this browser. Text and key sounds remain available.",
        );
    } catch {
      setNotice(
        "Audio is unavailable in this browser. The text interface is ready.",
      );
    }
  };

  const speak = useCallback(
    (content) => {
      stop();
      if (!enabledRef.current || !window.speechSynthesis || document.hidden)
        return;
      try {
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 1.04;
        utterance.pitch = 0.9;
        utterance.lang = "en-US";
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
          setSpeaking(false);
          speech.current = null;
        };
        utterance.onerror = (event) => {
          setSpeaking(false);
          speech.current = null;
          if (event.error !== "canceled" && event.error !== "interrupted")
            setNotice(
              "Voice playback is unavailable. The full response is shown on screen.",
            );
        };
        speech.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {
        setNotice(
          "Voice playback is unavailable. The full response is shown on screen.",
        );
      }
    },
    [stop],
  );

  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop();
      context.current?.close().catch(() => {});
      context.current = null;
    };
  }, [stop]);
  return { enabled, speaking, notice, toggle, tone, speak, stop };
}
