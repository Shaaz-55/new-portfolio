import { lazy, Suspense } from "react";
import ConversationPanel from "../conversation/ConversationPanel.jsx";
import BootSequence from "./BootSequence.jsx";

const DigitalAvatar = lazy(() => import("../avatar/DigitalAvatar.jsx"));

export default function CRTMonitor({
  state,
  conversation,
  onQuestion,
  reducedMotion,
  booting,
  onBootComplete,
}) {
  return (
    <div className="monitor-assembly">
      <div className="monitor-top">
        <span className="monitor-manufacturer">
          <span className="manufacturer-symbol">▰</span> SHAAZ SYSTEMS
          <span className="monitor-series">PERSONAL TERMINAL</span>
        </span>
        <span>
          CRT—01 <span className="serial-number">/ 001</span>
        </span>
      </div>
      <div className="monitor-bezel">
        <i className="screw screw-tl" />
        <i className="screw screw-tr" />
        <i className="screw screw-bl" />
        <i className="screw screw-br" />
        <div className="crt-glass">
          <div className="screen-topline">
            <span>
              <i className="led" /> SHAaz INTELLIGENCE SYSTEM
            </span>
            <span>SESSION / LOCAL_001</span>
          </div>
          <div className="screen-content">
            <Suspense
              fallback={
                <div className="avatar-region">
                  <span className="avatar-coordinate">
                    INITIALIZING PORTRAIT…
                  </span>
                </div>
              }
            >
              <DigitalAvatar state={state} reducedMotion={reducedMotion} />
            </Suspense>
            <ConversationPanel
              conversation={conversation}
              onQuestion={onQuestion}
              reducedMotion={reducedMotion}
            />
          </div>
          <div className="screen-bottomline">
            <span>
              <span className="terminal-square">▪</span> SYSTEM INITIALIZED
            </span>
            <span>HUMAN IDEAS. DIGITAL PRESENCE.</span>
            <span>
              CONNECTED <span className="terminal-square">▪</span>
            </span>
          </div>
          <div className="crt-scanlines" aria-hidden="true" />
          <div className="glass-reflection" aria-hidden="true" />
          {booting && (
            <BootSequence
              onComplete={onBootComplete}
              reducedMotion={reducedMotion}
            />
          )}
        </div>
      </div>
      <div className="monitor-chin">
        <span className="chin-brand">
          SHAaz<span>©</span>
        </span>
        <div className="chin-vents" />
        <span className="monitor-power">
          <i className="led" /> POWER
        </span>
        <div className="monitor-dials" aria-hidden="true">
          <i />
          <i />
        </div>
        <span className="monitor-service-label">
          PERSONAL INTELLIGENCE UNIT
        </span>
      </div>
      <div className="monitor-stand" aria-hidden="true" />
    </div>
  );
}
