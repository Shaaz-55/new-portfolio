import { useCallback, useEffect, useRef, useState } from "react";

export function useAudio() {
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const context = useRef(null);
  const enabledRef = useRef(false);
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
      return;
    }
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass && !context.current) context.current = new AudioClass();
      if (context.current?.state === "suspended")
        await context.current.resume();
      tone("submit");
    } catch {
      setNotice(
        "Audio is unavailable in this browser. The text interface is ready.",
      );
    }
  };

  useEffect(
    () => () => {
      context.current?.close().catch(() => {});
      context.current = null;
    },
    [],
  );
  return { enabled, notice, toggle, tone };
}
