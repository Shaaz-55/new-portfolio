import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechSynthesis(service) {
  const [status, setStatus] = useState("idle");
  const [activeId, setActiveId] = useState(null);
  const [notice, setNotice] = useState("");
  const current = useRef(null);
  const stop = useCallback(() => {
    const previous = current.current;
    current.current = null;
    clearTimeout(previous?.timer);
    previous?.handle?.stop();
    setStatus("idle");
    setActiveId(null);
  }, []);
  const play = useCallback(
    (message) => {
      stop();
      setNotice("");
      if (!message.complete || !message.content || document.hidden) return;
      const session = {};
      current.current = session;
      setStatus("starting");
      setActiveId(message.id);
      const finish = (error) => {
        if (current.current !== session) return;
        stop();
        if (error) setNotice(error.message);
      };
      try {
        session.handle = service.speak(message.content, {
          onStart() {
            if (current.current !== session) return;
            session.started = true;
            clearTimeout(session.timer);
            setStatus("speaking");
          },
          onEnd: () => finish(),
          onError: finish,
        });
        if (current.current !== session) session.handle?.stop();
        else if (!session.started)
          session.timer = setTimeout(
            () =>
              finish(
                new Error(
                  "Voice playback did not start. The answer is available as text.",
                ),
              ),
            60000,
          );
      } catch (error) {
        finish(error);
      }
    },
    [service, stop],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop, service]);
  return {
    supported: service.supported,
    status,
    activeId,
    notice,
    play,
    stop,
    speaking: status === "speaking",
  };
}
