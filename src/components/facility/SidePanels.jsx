import { archiveSections } from "../../data/portfolioData.js";
import Icon from "../Icon.jsx";

export default function SidePanels({ onQuestion, disabled }) {
  return (
    <>
      <aside className="side-panel side-left" aria-label="Identity module">
        <div className="side-hardware-label">IDENTITY</div>
        <div className="side-screen">
          <div className="fingerprint" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ "--ring": i }} />
            ))}
          </div>
          <h2>
            SHAAZ
            <br /> HEMANI
          </h2>
          <div className="identity-meta">
            <span>COMPUTER SCIENCE STUDENT</span>
            <span>BUILDER</span>
            <span>EXPERIMENTER</span>
            <span>ASPIRING FOUNDER</span>
          </div>
          <div className="side-screen-footer">
            <i className="led" /> STATUS: ACTIVE
          </div>
        </div>
        <div className="side-hardware-bottom" aria-hidden="true">
          <div className="vent-slots" />
          <span className="hardware-knob" />
        </div>
      </aside>
      <aside
        className="side-panel side-right"
        aria-label="Available portfolio topics"
      >
        <div className="side-hardware-label">ARCHIVE DIRECTORY</div>
        <nav className="side-screen" aria-label="Portfolio archive">
          {archiveSections.map((section) => (
            <button
              key={section.id}
              className="module-link"
              onClick={() => onQuestion(section.question)}
              disabled={disabled}
            >
              <span>
                {section.id === "leadership" ? "Leadership" : section.label}
              </span>
              <Icon name="arrow" size={14} />
            </button>
          ))}
        </nav>
        <div className="side-hardware-bottom" aria-hidden="true">
          <span className="hardware-knob" />
          <div className="vent-slots" />
        </div>
      </aside>
    </>
  );
}
