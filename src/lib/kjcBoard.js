import { direction, signedPercent } from "@/lib/kjc";

const ARROW = { up: "▲", down: "▼", flat: "" };

/**
 * The tape carries one thing, the percentage gain, quoted as $KJC with an
 * arrow so the direction never rests on colour alone. The board repeats it to
 * fill the strip.
 */
export function tapeItems(percent, copy) {
  const tone = direction(percent);
  const value = signedPercent(percent);
  return [{ key: "kjc", term: copy.symbol, value: ARROW[tone] ? `${ARROW[tone]} ${value}` : value, tone }];
}
