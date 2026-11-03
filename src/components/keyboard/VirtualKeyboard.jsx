import Icon from "../Icon.jsx";

const letterRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Backspace"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "?"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ":", ";"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
  ["123", "-", "@", "Space", "'", "Enter"],
];
const symbolRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Backspace"],
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "?"],
  ["[", "]", "{", "}", "<", ">", "+", "=", "|", ":", ";"],
  ["Shift", "~", "`", "_", "\\", "€", "₹", '"', ",", ".", "/"],
  ["123", "-", "@", "Space", "'", "Enter"],
];

export default function VirtualKeyboard({
  keyboard,
  disabled,
  expanded,
  onToggle,
}) {
  return (
    <div className={`keyboard-assembly ${expanded ? "is-expanded" : ""}`}>
      <div className="keyboard-topline">
        <span className="keyboard-model">SH / TACTILE INTERFACE—01</span>
        <div>
          <span className="keyboard-led-label">
            <i className="led" /> CONNECTED
          </span>
          <button
            className="keyboard-toggle"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="virtual-keyboard"
          >
            <Icon name="keyboard" size={15} />
            {expanded ? "HIDE KEYS" : "SHOW KEYS"}
          </button>
        </div>
      </div>
      <div
        className="keyboard-body"
        id="virtual-keyboard"
        role="group"
        aria-label="Virtual keyboard"
      >
        {(keyboard.symbols ? symbolRows : letterRows).map((row, index) => (
          <div className={`keyboard-row row-${index}`} key={index}>
            {row.map((key, position) => {
              const isSpecial = key.length > 1;
              const label =
                key === "123" && keyboard.symbols
                  ? "ABC"
                  : key === "Space"
                    ? "S P A C E"
                    : key === "Shift"
                      ? "SHIFT"
                      : key === "Enter"
                        ? "ENTER"
                        : key;
              return (
                <button
                  key={`${key}-${position}`}
                  type="button"
                  aria-label={
                    key === "123"
                      ? keyboard.symbols
                        ? "Switch to letters"
                        : "Switch to symbols"
                      : key === " "
                        ? "Space"
                        : key
                  }
                  aria-pressed={key === "Shift" ? keyboard.shift : undefined}
                  disabled={disabled}
                  data-key={key}
                  className={`key ${isSpecial ? `key-${key.toLowerCase()}` : ""} ${keyboard.pressed.has(key) || (key === "Shift" && keyboard.shift) ? "is-pressed" : ""}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => keyboard.virtualKey(key)}
                >
                  {key === "Backspace" ? (
                    <Icon name="backspace" size={15} />
                  ) : key === "Enter" ? (
                    <>
                      <span>{label}</span>
                      <Icon name="enter" size={14} />
                    </>
                  ) : (
                    label
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="keyboard-bottomline">
        <span>DESIGNED FOR CURIOSITY.</span>
        <span>
          TYPE ON YOUR KEYBOARD OR USE THE KEYS ABOVE <span>↵</span>
        </span>
      </div>
    </div>
  );
}
