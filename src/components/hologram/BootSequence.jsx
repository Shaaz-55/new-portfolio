import { useEffect, useState } from "react";

const steps = [
  "LOADING VISUAL INTERFACE",
  "CHECKING DISPLAY MODULES",
  "ESTABLISHING LOCAL SESSION",
  "SHAaz INTERFACE READY",
];
export default function BootSequence({ onComplete, reducedMotion }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    const progress = setInterval(
      () => setStep((current) => Math.min(current + 1, 3)),
      440,
    );
    const timeout = setTimeout(onComplete, 1950);
    return () => {
      clearInterval(progress);
      clearTimeout(timeout);
    };
  }, [onComplete, reducedMotion]);
  return (
    <div
      className="boot-overlay"
      role="status"
      aria-label="System initialization"
    >
      <div className="boot-emblem">
        S<span>H</span>
      </div>
      <span className="micro-label">PROJECT SHAaz / SYSTEM INITIALIZATION</span>
      <div className="boot-progress">
        <i style={{ width: `${(step + 1) * 25}%` }} />
      </div>
      <span className="boot-step">
        {steps[step]}
        <span className="blinking-cursor">_</span>
      </span>
      <button onClick={onComplete} className="boot-skip">
        SKIP INTRO ↗
      </button>
    </div>
  );
}
