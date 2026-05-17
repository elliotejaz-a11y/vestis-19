import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { CTASection } from "./explainer/CTASection";
import { OpeningHook } from "./explainer/OpeningHook";
import { ProblemStatement } from "./explainer/ProblemStatement";
import { SolutionReveal } from "./explainer/SolutionReveal";
import { SEG1, SEG2, SEG3, SEG4, TOTAL } from "./explainer/constants";

export const ExplainerVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Ambient background glow (varies by segment) ─────────────────────────────
  const burgGlowOpacity = interpolate(
    frame,
    [0, 60, SEG2, SEG3, SEG3 + 60, SEG4, SEG4 + 60, TOTAL - 50, TOTAL],
    [0.3, 0.5, 0.35, 0.35, 0.65, 0.70, 0.55, 0.3, 0.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const beigeGlowOpacity = interpolate(
    frame,
    [0, SEG2, SEG3, SEG4, TOTAL],
    [0.12, 0.10, 0.22, 0.18, 0.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Glow drifts across screen L→R
  const glowX = interpolate(frame, [0, TOTAL], [-120, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Impact flash on logo reveal (global frame ~780, local seg3 frame ~60) ────
  const impactFlash = interpolate(
    frame,
    [SEG3 + 58, SEG3 + 62, SEG3 + 80],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Final black fade ─────────────────────────────────────────────────────────
  const finalFade = interpolate(frame, [TOTAL - 50, TOTAL], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 46%, #1a0407 0%, #0a0102 52%, #000005 100%)",
        overflow: "hidden",
      }}
    >
      {/* ── Primary burgundy ambient glow ── */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            width: 1200,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(123,36,50,1) 0%, rgba(123,36,50,0) 65%)",
            filter: "blur(80px)",
            opacity: burgGlowOpacity,
            transform: `translate(${glowX}px, 0px)`,
          }}
        />
      </AbsoluteFill>

      {/* ── Warm beige secondary glow ── */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            width: 700,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(248,241,231,0.55) 0%, transparent 68%)",
            filter: "blur(100px)",
            opacity: beigeGlowOpacity,
            transform: `translate(${-glowX * 0.4}px, 160px)`,
          }}
        />
      </AbsoluteFill>

      {/* ── Cinematic vignette ── */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* ── Segment 1: Opening Hook ── */}
      <Sequence from={SEG1} durationInFrames={SEG2 - SEG1}>
        <OpeningHook />
      </Sequence>

      {/* ── Segment 2: Problem Statement ── */}
      <Sequence from={SEG2} durationInFrames={SEG3 - SEG2}>
        <ProblemStatement />
      </Sequence>

      {/* ── Segment 3: Solution Reveal ── */}
      <Sequence from={SEG3} durationInFrames={SEG4 - SEG3}>
        <SolutionReveal />
      </Sequence>

      {/* ── Segment 4: CTA & Closing ── */}
      <Sequence from={SEG4} durationInFrames={TOTAL - SEG4}>
        <CTASection />
      </Sequence>

      {/* ── Impact flash on logo reveal ── */}
      {impactFlash > 0 && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(248,241,231,0.90) 0%, rgba(123,36,50,0.35) 45%, transparent 70%)",
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
