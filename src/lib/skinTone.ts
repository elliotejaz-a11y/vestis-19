const skinToneStops = [
  { value: 0, label: "Porcelain", color: "#FFEEDE" },
  { value: 7, label: "Ivory", color: "#FFF0E0" },
  { value: 14, label: "Warm Ivory", color: "#FDEBD0" },
  { value: 21, label: "Light Beige", color: "#F5CBA7" },
  { value: 29, label: "Warm Beige", color: "#E8C9A0" },
  { value: 36, label: "Golden Beige", color: "#D4A76A" },
  { value: 43, label: "Honey", color: "#DC7633" },
  { value: 50, label: "Golden Tan", color: "#BA9B68" },
  { value: 57, label: "Caramel", color: "#C68642" },
  { value: 64, label: "Chestnut", color: "#A0522D" },
  { value: 71, label: "Mocha", color: "#8D6E63" },
  { value: 79, label: "Espresso", color: "#6F4E37" },
  { value: 86, label: "Deep Cocoa", color: "#4E342E" },
  { value: 93, label: "Rich Ebony", color: "#3B2F2F" },
  { value: 100, label: "Midnight", color: "#2C1E1E" },
] as const;

export const SKIN_TONE_GRADIENT = skinToneStops.map((stop) => stop.color);

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function getSkinToneColor(value: number): string {
  const safeValue = clamp(value);
  const exact = skinToneStops.find((stop) => stop.value === safeValue);
  if (exact) return exact.color;

  const lower = [...skinToneStops].reverse().find((stop) => stop.value <= safeValue) ?? skinToneStops[0];
  const upper = skinToneStops.find((stop) => stop.value >= safeValue) ?? skinToneStops[skinToneStops.length - 1];

  if (lower.value === upper.value) return lower.color;

  const range = upper.value - lower.value;
  const t = (safeValue - lower.value) / range;
  const lowRgb = hexToRgb(lower.color);
  const highRgb = hexToRgb(upper.color);

  const r = Math.round(lowRgb.r * (1 - t) + highRgb.r * t);
  const g = Math.round(lowRgb.g * (1 - t) + highRgb.g * t);
  const b = Math.round(lowRgb.b * (1 - t) + highRgb.b * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getSkinToneLabel(value: number): string {
  const safeValue = clamp(value);
  return skinToneStops.reduce((closest, stop) => {
    const currentDistance = Math.abs(stop.value - safeValue);
    const bestDistance = Math.abs(closest.value - safeValue);
    return currentDistance < bestDistance ? stop : closest;
  }, skinToneStops[0]).label;
}

export function getSkinToneValue(input?: string | null): number {
  if (!input) return 50;

  const numericValue = Number(input);
  if (Number.isFinite(numericValue)) return clamp(numericValue);

  const normalized = input.trim().toLowerCase();
  const matched = skinToneStops.find((stop) => stop.label.toLowerCase() === normalized);
  return matched?.value ?? 50;
}

export function getSkinToneDisplay(input?: string | null): string | null {
  if (!input?.trim()) return null;

  const numericValue = Number(input);
  if (Number.isFinite(numericValue)) return getSkinToneLabel(numericValue);

  const normalized = input.trim().toLowerCase();
  const matched = skinToneStops.find((stop) => stop.label.toLowerCase() === normalized);
  return matched?.label ?? input.trim();
}