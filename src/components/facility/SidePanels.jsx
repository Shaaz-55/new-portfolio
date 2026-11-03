import { portfolioData } from "../../data/portfolioData.js";

export default function SidePanels({ onQuestion, disabled }) {
  return (
    <>
      <aside className="side-panel side-left" aria-label="Identity module">
        <div className="side-hardware-label">
          <span>IDENTITY MODULE</span>
          <span>01</span>
        </div>
        <div className="side-screen">
          <div className="fingerprint" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ "--ring": i }} />
            ))}
          </div>
          <span className="micro-label">SUBJECT IDENTIFIED</span>
          <h2>
            SHAAZ
            <br />
            HEMANI<span>_</span>
          </h2>
          <div className="identity-meta">
            <span>COMPUTER SCIENCE</span>
            <span>BUILDER · EXPERIMENTER</span>
            <span>ASPIRING FOUNDER</span>
          </div>
          <div className="side-screen-footer">
            <i className="led" /> PROFILE ACTIVE
          </div>
        </div>
        <div className="side-hardware-bottom">
          <div className="vent-slots" />
          <span className="hardware-knob" />
        </div>
        <div className="side-caption">
          PERSONAL ARCHIVE <span>SH—001</span>
        </div>
      </aside>
      <aside
        className="side-panel side-right"
        aria-label="Available portfolio topics"
      >
        <div className="side-hardware-label">
          <span>ARCHIVE DIRECTORY</span>
          <span>02</span>
        </div>
        <div className="side-screen">
          <div className="module-heading">
            <i className="led" /> ACTIVE MODULES
          </div>
          {[
            ["01", "Projects", "Show me your projects"],
            ["02", "Technical skills", "What are your technical skills?"],
            ["03", "Ambitions", "What are your ambitions?"],
            ["04", "Contact", "How can I contact you?"],
          ].map(([index, name, question]) => (
            <button
              className="module-link"
              key={index}
              onClick={() => onQuestion(question)}
              disabled={disabled}
            >
              <span>{index}</span>
              {name}
              <b>↗</b>
            </button>
          ))}
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 33 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${10 + Math.sin(i * 2.1) ** 2 * 24}px`,
                  animationDelay: `${i * -0.13}s`,
                }}
              />
            ))}
          </div>
          <div className="signal-label">
            <span>LOCAL SIGNAL</span>
            <span>STABLE</span>
          </div>
        </div>
        <div className="side-hardware-bottom">
          <span className="hardware-knob" />
          <div className="indicator-array">
            <i />
            <i />
            <i />
          </div>
          <span className="hardware-knob small" />
        </div>
        <div className="side-caption">
          {portfolioData.projects.length} PROJECT FILES <span>READY</span>
        </div>
      </aside>
    </>
  );
}
