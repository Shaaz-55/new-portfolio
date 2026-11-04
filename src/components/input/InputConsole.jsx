import { MAX_INPUT_LENGTH } from "../../services/conversationContract.js";
import Icon from "../Icon.jsx";
import Waveform from "../voice/Waveform.jsx";

export default function InputConsole({
  inputRef,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  busy,
  phase,
  onFocus,
  onBlur,
  recognition,
  onRecord,
  onDiscard,
}) {
  return (
    <form
      className={`input-console ${busy ? "input-busy" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="input-label-row">
        <label htmlFor="question-input">
          ASK A QUESTION <span>/ TEXT OR VOICE</span>
        </label>
        <span>
          {busy
            ? phase === "thinking"
              ? "PROCESSING QUERY"
              : "RECEIVING RESPONSE"
            : "AWAITING INPUT"}
          <span className="blinking-cursor">_</span>
        </span>
      </div>
      <div className="input-well">
        <span className="input-prompt" aria-hidden="true">
          &gt;_
        </span>
        <textarea
          ref={inputRef}
          id="question-input"
          rows={1}
          maxLength={MAX_INPUT_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={busy || recognition.active}
          aria-disabled={busy || recognition.active}
          placeholder={
            recognition.active
              ? "Listening to your question…"
              : busy
                ? "Shaaz is responding…"
                : "Ask about my work, ideas, or what comes next…"
          }
          aria-describedby="input-help voice-status"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          className={`mic-button ${recognition.active ? "is-recording" : ""}`}
          onClick={recognition.active ? recognition.stop : onRecord}
          disabled={
            busy ||
            !recognition.supported ||
            recognition.status === "processing" ||
            recognition.status === "starting"
          }
          aria-label={
            recognition.active ? "Stop recording" : "Start voice input"
          }
          aria-pressed={recognition.active}
          title={
            recognition.supported
              ? "Dictate a question"
              : "Speech recognition is unavailable in this browser"
          }
        >
          <Icon name={recognition.active ? "stop" : "mic"} size={21} />
        </button>
        <button
          type="submit"
          className="submit-button"
          disabled={busy || recognition.active || !value.trim()}
          aria-label="Submit question"
        >
          <span>{busy ? "WAIT" : "SEND"}</span>
          <Icon name="enter" size={17} />
        </button>
      </div>
      <div
        className={`voice-status voice-${recognition.status}`}
        id="voice-status"
      >
        {recognition.active ? (
          <>
            <div className="recording-status">
              <span role="status">
                <i className="led" />
                {recognition.status === "starting"
                  ? "WAITING FOR MICROPHONE"
                  : recognition.status === "processing"
                    ? "PROCESSING VOICE INPUT"
                    : "RECORDING"}
              </span>
              <Waveform active={recognition.status === "listening"} />
              <button
                type="button"
                className="text-button"
                onClick={recognition.cancel}
              >
                <Icon name="close" size={13} /> Cancel
              </button>
            </div>
            <p
              className="live-transcript"
              aria-live="polite"
              aria-atomic="true"
            >
              {recognition.transcript ||
                (recognition.status === "starting"
                  ? "Allow microphone access in your browser to begin."
                  : "Speak naturally. Stop when you’re ready to review.")}
            </p>
          </>
        ) : (
          <div className="voice-guidance">
            <span role={recognition.status === "error" ? "alert" : "status"}>
              {recognition.notice ||
                (recognition.supported
                  ? "Speak or type. You choose when to send."
                  : "Voice input is unavailable in this browser. You can type your question.")}
            </span>
            {recognition.status === "transcribed" && (
              <button type="button" className="text-button" onClick={onDiscard}>
                Discard voice text
              </button>
            )}
            <span className="input-shortcut">ENTER ↵</span>
          </div>
        )}
      </div>
      <span id="input-help" className="sr-only">
        Enter sends your question. Shift and Enter inserts a new line. Up to 500
        characters. Voice input is never submitted automatically. Your browser
        may process speech using its online recognition service. Responses are
        predefined for this local demo.
      </span>
    </form>
  );
}
