import { useCallback, useRef, useState } from "react";
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

function needsBoot() {
  try {
    return !sessionStorage.getItem("shaaz-booted");
  } catch {
    return true;
  }
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const audio = useAudio();
  const [booting, setBooting] = useState(needsBoot);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const conversation = useConversation({
    reducedMotion,
    onAnswer: audio.speak,
    onReset: audio.stop,
  });
  const completeBoot = useCallback(() => {
    setBooting(false);
    try {
      sessionStorage.setItem("shaaz-booted", "1");
    } catch {
      /* Storage is optional. */
    }
  }, []);
  const ask = (question) => {
    if (conversation.isBusy || !question.trim()) return;
    completeBoot();
    audio.stop();
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
    disabled: conversation.isBusy,
    tone: audio.tone,
  });
  const avatarState =
    conversation.phase === "thinking"
      ? "thinking"
      : conversation.phase === "speaking" || audio.speaking
        ? "speaking"
        : focused
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
        onReset={() => {
          conversation.reset();
          setValue("");
        }}
        hasMessages={conversation.messages.length > 0}
        busy={conversation.isBusy}
      />
      <main className="control-room" id="terminal">
        <div className="scene-heading">
          <div>
            <span className="section-cross">+</span>
            <span>
              AN INTERACTIVE PORTFOLIO
              <br />
              <b>ENTER THE MIND OF A BUILDER.</b>
            </span>
          </div>
          <span className="scene-heading-right">
            EST. CURIOSITY
            <br />
            <b>OPEN TO POSSIBILITIES</b>
          </span>
        </div>
        <div className="station">
          <SidePanels onQuestion={ask} disabled={conversation.isBusy} />
          <CRTMonitor
            state={avatarState}
            conversation={conversation}
            onQuestion={ask}
            reducedMotion={reducedMotion}
            booting={booting}
            onBootComplete={completeBoot}
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
            />
            <VirtualKeyboard
              keyboard={keyboard}
              disabled={conversation.isBusy}
              expanded={expanded}
              onToggle={() => setExpanded((current) => !current)}
            />
          </div>
        </div>
        <div className="room-footer">
          <span>
            <i className="led" /> ALL GOOD CONVERSATIONS START WITH CURIOSITY.
          </span>
          <span>
            FRONTEND DEMO <i /> LOCAL RESPONSES <i /> NO DATA SENT
          </span>
          <span>SH / 001</span>
        </div>
      </main>
      {audio.notice && (
        <div className="audio-notice" role="status">
          {audio.notice}
        </div>
      )}
    </div>
  );
}
