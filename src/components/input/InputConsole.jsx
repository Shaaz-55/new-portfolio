import { MAX_INPUT_LENGTH } from "../../services/mockConversationService.js";
import Icon from "../Icon.jsx";

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
          INTERVIEW TERMINAL <span>// INPUT</span>
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
          readOnly={busy}
          aria-disabled={busy}
          placeholder={busy ? "Shaaz is responding…" : "Ask Shaaz anything…"}
          aria-describedby="input-help"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="submit-button"
          disabled={busy || !value.trim()}
          aria-label="Submit question"
        >
          <span>{busy ? "WAIT" : "SEND"}</span>
          <Icon name="enter" size={17} />
        </button>
      </div>
      <span id="input-help" className="sr-only">
        Enter sends your question. Shift and Enter inserts a new line. Up to 500
        characters. Responses are predefined for this local demo.
      </span>
    </form>
  );
}
