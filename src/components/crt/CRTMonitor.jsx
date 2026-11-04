import { lazy, Suspense } from "react";
import ConversationPanel from "../conversation/ConversationPanel.jsx";
import BootSequence from "../hologram/BootSequence.jsx";

const Avatar3D = lazy(() => import("../Avatar3D.jsx"));

// Original physical monitor construction, with the current voice/conversation wiring.
export default function CRTMonitor({
  state,
  conversation,
  onQuestion,
  reducedMotion,
  booting,
  onBootComplete,
  speech,
  onPlay,
  inputActive,
  recording,
}) {
  return (
    <div className="monitor-assembly">
      <div className="monitor-top">
        <span>SHAAZ SYSTEMS</span>
      </div>
      <div className="monitor-bezel">
        <i className="screw screw-tl" aria-hidden="true" />
        <i className="screw screw-tr" aria-hidden="true" />
        <i className="screw screw-bl" aria-hidden="true" />
        <i className="screw screw-br" aria-hidden="true" />
        <div className="crt-glass">
          <div className="screen-topline">
            <span>PERSONAL INTELLIGENCE INTERFACE</span>
          </div>
          <div className="screen-content">
            <Suspense
              fallback={
                <div className="avatar-region">
                  <span className="avatar-loading" role="status">
                    Loading portrait…
                  </span>
                </div>
              }
            >
              <Avatar3D
                state={state}
                reducedMotion={reducedMotion}
                recording={recording}
              />
            </Suspense>
            <ConversationPanel
              conversation={conversation}
              onQuestion={onQuestion}
              speech={speech}
              onPlay={onPlay}
              inputActive={inputActive}
            />
          </div>
          <div className="screen-bottomline" aria-hidden="true" />
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
      <div className="monitor-chin" aria-hidden="true">
        <span className="chin-brand">SHAaz</span>
        <div className="chin-vents" />
        <div className="monitor-dials">
          <i />
          <i />
        </div>
      </div>
      <div className="monitor-stand" aria-hidden="true" />
    </div>
  );
}
