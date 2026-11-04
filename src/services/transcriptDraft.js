export function insertTranscript({ value, start, end }, transcript, maxLength) {
  const before = value.slice(0, start),
    after = value.slice(end);
  const leading = before && !/\s$/.test(before) ? " " : "";
  const trailing = after && !/^[\s.,!?;:]/.test(after) ? " " : "";
  const room = Math.max(0, maxLength - before.length - after.length);
  const addition = (leading + transcript + trailing).slice(0, room);
  return {
    value: before + addition + after,
    caret: before.length + addition.length,
    truncated:
      addition.length < leading.length + transcript.length + trailing.length,
  };
}
