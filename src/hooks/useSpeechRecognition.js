import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ service, onFinal }) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const current = useRef(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const cancel = useCallback(() => {
    const previous = current.current;
    current.current = null;
    previous?.handle?.cancel();
    clearTimeout(previous?.timer);
    setStatus("idle");
    setTranscript("");
    setNotice("");
  }, []);
  const stop = useCallback(() => {
    if (!current.current) return;
    setStatus("processing");
    current.current.handle?.stop();
  }, []);
  const start = useCallback(() => {
    if (current.current) return;
    setNotice("");
    setTranscript("");
    if (!service.supported) {
      setStatus("error");
      setNotice(
        "Speech recognition is unavailable in this browser. You can type your question instead.",
      );
      return;
    }
    const session = {};
    current.current = session;
    setStatus("starting");
    const release = () => {
      clearTimeout(session.timer);
      current.current = null;
    };
    const fail = (error) => {
      if (current.current !== session) return;
      release();
      setStatus("error");
      setTranscript("");
      setNotice(
        error.message || "Microphone unavailable. You can keep typing.",
      );
    };
    try {
      session.handle = service.start({
        onStart() {
          if (current.current !== session) return;
          session.started = true;
          clearTimeout(session.timer);
          setStatus("listening");
        },
        onResult({ final, interim }) {
          if (current.current === session)
            setTranscript([final, interim].filter(Boolean).join(" "));
        },
        onEnd({ text }) {
          if (current.current !== session) return;
          release();
          setTranscript("");
          if (text.trim()) {
            setStatus("transcribed");
            setNotice(
              onFinalRef.current(text.trim()) ||
                "Voice text added. Review and edit it, then send when ready.",
            );
          } else {
            setStatus("error");
            setNotice(
              "No speech was recognised. Try again or type your question.",
            );
          }
        },
        onError: fail,
      });
      if (current.current !== session) session.handle?.cancel();
      else if (!session.started)
        session.timer = setTimeout(() => {
          session.handle?.cancel();
          fail(
            new Error(
              "The microphone did not start. Check browser permissions or keep typing.",
            ),
          );
        }, 20000);
    } catch (error) {
      fail(error);
    }
  }, [service]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", cancel);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, [cancel, service]);
  return {
    supported: service.supported,
    status,
    transcript,
    notice,
    start,
    stop,
    cancel,
    active: ["starting", "listening", "processing"].includes(status),
  };
}
