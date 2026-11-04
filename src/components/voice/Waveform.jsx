export default function Waveform({ active = false }) {
  return (
    <span
      className={`voice-bars ${active ? "is-active" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 15 }, (_, i) => (
        <i
          key={i}
          style={{
            "--bar-height": `${25 + Math.sin(i * 2.1) ** 2 * 75}%`,
            animationDelay: `${i * -0.13}s`,
          }}
        />
      ))}
    </span>
  );
}
