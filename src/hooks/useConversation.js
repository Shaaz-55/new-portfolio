import { useCallback, useEffect, useRef, useState } from "react";
import { emptyConversationContext } from "../services/conversationContract.js";
import { portfolioData } from "../data/portfolioData.js";

export function useConversation({ reducedMotion, service, onReset }) {
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const busy = useRef(false);
  const abortRef = useRef(null);
  const timer = useRef(null);
  const serial = useRef(0);
  const contextRef = useRef(emptyConversationContext());

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearInterval(timer.current);
    },
    [],
  );

  const submit = useCallback(
    async (value) => {
      const question = value.trim();
      if (!question || busy.current) return false;
      busy.current = true;
      setError("");
      setPhase("thinking");
      setAnnouncement("Processing your question.");
      const id = ++serial.current;
      setMessages((previous) => [
        ...previous,
        { id: `${id}-q`, role: "visitor", content: question, sequence: id },
      ]);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const answer = await service.reply(question, {
          signal: controller.signal,
          context: contextRef.current,
        });
        if (controller.signal.aborted) return false;
        contextRef.current = answer.context;
        setPhase("responding");
        const answerId = `${id}-a`;
        setMessages((previous) => [
          ...previous,
          {
            id: answerId,
            role: "shaaz",
            content: reducedMotion ? answer.content : "",
            sequence: id,
            topic: answer.topic,
            links: reducedMotion ? answer.links : [],
            complete: reducedMotion,
          },
        ]);
        const finish = () => {
          busy.current = false;
          setPhase("idle");
          setAnnouncement(`${portfolioData.identity.name}: ${answer.content}`);
        };
        if (reducedMotion) finish();
        else {
          let visible = 0;
          timer.current = setInterval(() => {
            visible = Math.min(visible + 4, answer.content.length);
            setMessages((previous) =>
              previous.map((message) =>
                message.id === answerId
                  ? {
                      ...message,
                      content: answer.content.slice(0, visible),
                      links:
                        visible === answer.content.length ? answer.links : [],
                      complete: visible === answer.content.length,
                    }
                  : message,
              ),
            );
            if (visible >= answer.content.length) {
              clearInterval(timer.current);
              finish();
            }
          }, 22);
        }
      } catch (exception) {
        if (exception.name !== "AbortError") {
          setError("The local response could not be loaded. Please try again.");
          setAnnouncement(
            "The local response could not be loaded. Please try again.",
          );
          setPhase("idle");
          busy.current = false;
        }
      }
      return true;
    },
    [reducedMotion, service],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearInterval(timer.current);
    busy.current = false;
    contextRef.current = emptyConversationContext();
    serial.current = 0;
    setMessages([]);
    setPhase("idle");
    setError("");
    setAnnouncement("Session cleared. Ready for a new question.");
    onReset?.();
  }, [onReset]);

  return {
    messages,
    phase,
    error,
    announcement,
    submit,
    reset,
    isBusy: phase !== "idle",
  };
}
