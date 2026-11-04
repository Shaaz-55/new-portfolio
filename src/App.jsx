import { useCallback, useEffect, useRef, useState } from "react";
import FacilityEnvironment from "./components/facility/FacilityEnvironment.jsx";
import SidePanels from "./components/facility/SidePanels.jsx";
import SystemHUD from "./components/hud/SystemHUD.jsx";
import CRTMonitor from "./components/crt/CRTMonitor.jsx";
import InputConsole from "./components/input/InputConsole.jsx";
import VirtualKeyboard from "./components/keyboard/VirtualKeyboard.jsx";
import { useReducedMotion } from "./hooks/usePreferences.js";
import { useAudio } from "./hooks/useAudio.js";
import { useConversation } from "./hooks/useConversation.js";
import { useKeyboardInput } from "./hooks/useKeyboardInput.js";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis.js";
import { interactionServices } from "./services/interactionServices.js";
import { insertTranscript } from "./services/transcriptDraft.js";
import { MAX_INPUT_LENGTH } from "./services/conversationContract.js";

function needsBoot() {
  try {
    return !sessionStorage.getItem("shaaz-booted");
  } catch {
    return true;
  }
}

export default function App({ services = interactionServices }) {
  const reducedMotion = useReducedMotion();
  const audio = useAudio();
  const speech = useSpeechSynthesis(services.synthesis);
  const [booting, setBooting] = useState(needsBoot);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const draftBeforeVoice = useRef(null);
  const conversation = useConversation({
    reducedMotion,
    service: services.conversation,
    onReset: speech.stop,
  });
  const recognition = useSpeechRecognition({
    service: services.recognition,
    onFinal(text) {
      const draft = insertTranscript(
        draftBeforeVoice.current,
        text,
        MAX_INPUT_LENGTH,
      );
      setValue(draft.value);
      requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.setSelectionRange(draft.caret, draft.caret);
      });
      return draft.truncated
        ? "Voice text was shortened to fit 500 characters. Review your draft before sending."
        : "";
    },
  });
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      if (
        window.innerWidth < 768 &&
        viewport &&
        window.innerHeight - viewport.height > 150
      )
        setExpanded(false);
    };
    viewport?.addEventListener("resize", resize);
    return () => viewport?.removeEventListener("resize", resize);
  }, []);
  const completeBoot = useCallback(() => {
    setBooting(false);
    try {
      sessionStorage.setItem("shaaz-booted", "1");
    } catch {
      /* Optional storage. */
    }
  }, []);
  const ask = (question) => {
    if (conversation.isBusy || recognition.active || !question.trim()) return;
    completeBoot();
    recognition.cancel();
    speech.stop();
    audio.tone("submit");
    setValue("");
    conversation.submit(question);
  };
  const submit = () => ask(value);
  const keyboard = useKeyboardInput({
    inputRef,
    value,
    setValue,
    submit,
    disabled: conversation.isBusy || recognition.active,
    tone: audio.tone,
  });
  const record = () => {
    if (conversation.isBusy) return;
    completeBoot();
    speech.stop();
    draftBeforeVoice.current = {
      value,
      start: inputRef.current?.selectionStart ?? value.length,
      end: inputRef.current?.selectionEnd ?? value.length,
    };
    recognition.start();
  };
  const avatarState = speech.speaking
    ? "speaking"
    : conversation.phase === "thinking" || recognition.status === "processing"
      ? "thinking"
      : recognition.active || (focused && !conversation.isBusy)
        ? "listening"
        : "idle";
  return (
    <div className={`experience ${reducedMotion ? "reduced-motion" : ""}`}>
      <a href="#question-input" className="skip-link">
        Skip to question input
      </a>
      <FacilityEnvironment />
      <SystemHUD
        audio={audio}
        speech={speech}
        onReset={() => {
          recognition.cancel();
          conversation.reset();
          setValue("");
        }}
        hasMessages={conversation.messages.length > 0}
        busy={conversation.isBusy}
      />
      <main className="control-room" id="terminal">
        <div className="station">
          <SidePanels
            onQuestion={ask}
            disabled={conversation.isBusy || recognition.active}
          />
          <CRTMonitor
            state={avatarState}
            conversation={conversation}
            onQuestion={ask}
            reducedMotion={reducedMotion}
            booting={booting}
            onBootComplete={completeBoot}
            speech={speech}
            onPlay={(message) => {
              recognition.cancel();
              speech.play(message);
            }}
            inputActive={recognition.active}
            recording={recognition.status === "listening"}
          />
          <div className="input-deck">
            <InputConsole
              inputRef={inputRef}
              value={value}
              onChange={setValue}
              onSubmit={submit}
              onKeyDown={keyboard.onKeyDown}
              busy={conversation.isBusy}
              phase={conversation.phase}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              recognition={recognition}
              onRecord={record}
              onDiscard={() => {
                setValue(draftBeforeVoice.current?.value || "");
                recognition.cancel();
                inputRef.current?.focus();
              }}
            />
            <VirtualKeyboard
              keyboard={keyboard}
              disabled={conversation.isBusy || recognition.active}
              expanded={expanded}
              onToggle={() => setExpanded((current) => !current)}
            />
          </div>
        </div>
      </main>
      {(audio.notice || speech.notice) && (
        <div className="audio-notice" role="status">
          {speech.notice || audio.notice}
        </div>
      )}
    </div>
  );
}
