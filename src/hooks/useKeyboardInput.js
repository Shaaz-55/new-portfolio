import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_INPUT_LENGTH } from "../services/mockConversationService.js";

export function useKeyboardInput({
  inputRef,
  value,
  setValue,
  submit,
  disabled,
  tone,
}) {
  const [pressed, setPressed] = useState(new Set());
  const [shift, setShift] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const timers = useRef(new Map());
  const pulse = useCallback((key) => {
    const normal =
      key === " " ? "Space" : key.length === 1 ? key.toUpperCase() : key;
    setPressed((previous) => new Set(previous).add(normal));
    clearTimeout(timers.current.get(normal));
    timers.current.set(
      normal,
      setTimeout(() => {
        setPressed((previous) => {
          const next = new Set(previous);
          next.delete(normal);
          return next;
        });
        timers.current.delete(normal);
      }, 140),
    );
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const onKeyDown = (event) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.nativeEvent.isComposing
    )
      return;
    pulse(event.key);
    if (!disabled) tone("key");
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!event.repeat && !disabled) submit();
    }
  };

  const virtualKey = (key) => {
    if (disabled) return;
    pulse(key);
    tone(key === "Enter" ? "submit" : "key");
    if (key === "Shift") {
      setShift((current) => !current);
      return;
    }
    if (key === "123") {
      setSymbols((current) => !current);
      return;
    }
    if (key === "Enter") {
      submit();
      return;
    }
    const input = inputRef.current;
    let start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    let insertion = key === "Space" ? " " : key;
    if (key === "Backspace") {
      if (start === end) {
        const before = value.slice(0, start);
        if (typeof Intl.Segmenter === "function")
          start =
            [
              ...new Intl.Segmenter(undefined, {
                granularity: "grapheme",
              }).segment(before),
            ].at(-1)?.index ?? 0;
        else start = Math.max(0, start - ([...before].at(-1)?.length ?? 1));
      }
      insertion = "";
    } else if (insertion.length === 1 && /[a-z]/i.test(insertion))
      insertion = shift ? insertion.toUpperCase() : insertion.toLowerCase();
    const next = (value.slice(0, start) + insertion + value.slice(end)).slice(
      0,
      MAX_INPUT_LENGTH,
    );
    setValue(next);
    if (shift) setShift(false);
    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(
        start + insertion.length,
        start + insertion.length,
      );
    });
  };
  return { pressed, shift, symbols, virtualKey, onKeyDown };
}
