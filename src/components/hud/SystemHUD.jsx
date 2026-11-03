import Icon from "../Icon.jsx";

export default function SystemHUD({ audio, onReset, hasMessages, busy }) {
  return (
    <header className="system-hud">
      <a
        className="wordmark"
        href="#terminal"
        aria-label="SHAaz — go to interview terminal"
      >
        <span className="brand-symbol" aria-hidden="true">
          S<span>H</span>
        </span>
        <span className="brand-name">
          SHAaz
          <span className="brand-subtitle">
            PERSONAL INTELLIGENCE INTERFACE
          </span>
        </span>
      </a>
      <div className="hud-right">
        <span className="online-status">
          <i className="led" /> SYSTEM ONLINE
        </span>
        <span className="local-status">
          LOCAL DEMO{" "}
          <span className="connection-bars" aria-hidden="true">
            ▂▄▆
          </span>
        </span>
        {hasMessages && (
          <button
            className="icon-button reset-button"
            aria-label="Clear conversation and start a new session"
            onClick={onReset}
            disabled={busy}
          >
            <Icon name="reset" />
          </button>
        )}
        <button
          className={`audio-button ${audio.enabled ? "is-on" : ""}`}
          onClick={audio.toggle}
          aria-label={audio.enabled ? "Mute audio" : "Enable audio"}
          aria-pressed={audio.enabled}
        >
          <Icon name={audio.enabled ? "volume" : "muted"} size={16} />
          <span>AUDIO {audio.enabled ? "ON" : "OFF"}</span>
        </button>
      </div>
    </header>
  );
}
