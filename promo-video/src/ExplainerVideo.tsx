import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { CTASection } from "./explainer/CTASection";
import { SEG1, SEG2, SEG3, SEG4, setFont, TOTAL } from "./explainer/constants";
import { OpeningHook } from "./explainer/OpeningHook";
import { ProblemStatement } from "./explainer/ProblemStatement";
import { SolutionReveal } from "./explainer/SolutionReveal";

// Load Inter at module level — Remotion blocks rendering until ready
const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
setFont(fontFamily);

export const ExplainerVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Animated glow position (slow drift L→R across the whole video) ───────────
  const glowCx = interpolate(frame, [0, TOTAL], [42, 58], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowCy = 48 + Math.sin(frame * 0.012) * 4;

  // ── Burgundy glow intensity by segment ───────────────────────────────────────
  const burgA = interpolate(
    frame,
    [0, 60, SEG2, SEG3, SEG3 + 60, SEG4, SEG4 + 60, TOTAL - 50, TOTAL],
    [0.28, 0.48, 0.32, 0.32, 0.60, 0.65, 0.50, 0.28, 0.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Beige highlight intensity ─────────────────────────────────────────────────
  const beigeA = interpolate(
    frame,
    [0, SEG2, SEG3, SEG4, TOTAL],
    [0.08, 0.07, 0.16, 0.13, 0.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pure CSS stacked radial-gradients — no filter:blur, no clipping artifacts.
  // Each gradient fades cleanly to transparent, layered atop the deep base.
  const background = [
    // Beige accent — upper-left counter-drift
    `radial-gradient(ellipse 55% 42% at ${100 - glowCx}% ${glowCy - 8}%, rgba(248,241,231,${beigeA.toFixed(3)}) 0%, transparent 100%)`,
    // Burgundy main glow — follows glowCx
    `radial-gradient(ellipse 72% 65% at ${glowCx}% ${glowCy}%, rgba(123,36,50,${burgA.toFixed(3)}) 0%, transparent 100%)`,
    // Base: deep wine-black
    `radial-gradient(ellipse at 50% 48%, #1a0407 0%, #0b0103 55%, #000000 100%)`,
  ].join(", ");

  // ── Impact flash on logo reveal (SEG3 + ~60 frames) ──────────────────────────
  const impactFlash = interpolate(
    frame,
    [SEG3 + 58, SEG3 + 63, SEG3 + 82],
    [0, 0.85, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Final black fade ──────────────────────────────────────────────────────────
  const finalFade = interpolate(frame, [TOTAL - 50, TOTAL], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>

      {/* ── Edge vignette — pure radial-gradient, no extra div needed ── */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.70) 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* ── Segments ── */}
      <Sequence from={SEG1} durationInFrames={SEG2 - SEG1}>
        <OpeningHook />
      </Sequence>

      <Sequence from={SEG2} durationInFrames={SEG3 - SEG2}>
        <ProblemStatement />
      </Sequence>

      <Sequence from={SEG3} durationInFrames={SEG4 - SEG3}>
        <SolutionReveal />
      </Sequence>

      <Sequence from={SEG4} durationInFrames={TOTAL - SEG4}>
        <CTASection />
      </Sequence>

      {/* ── Logo-reveal impact flash ── */}
      {impactFlash > 0 && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(248,241,231,0.88) 0%, rgba(123,36,50,0.30) 50%, transparent 100%)",
            opacity: impactFlash,
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}

      {/* ── Final black fade ── */}
      <AbsoluteFill
        style={{
          background: "#000000",
          opacity: finalFade,
          pointerEvents: "none",
          zIndex: 100,
        }}
      />
    </AbsoluteFill>
  );
};
