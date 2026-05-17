import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "./constants";

// Segment 1: 0–360 frames (0–6 s)
// useCurrentFrame() here is local to the Sequence (0-based)
export const OpeningHook: React.FC = () => {
  const frame = useCurrentFrame();

  const textOpacity = interpolate(
    frame,
    [36, 60, 310, 350],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const textY = interpolate(frame, [36, 72], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle scale in
  const textScale = interpolate(frame, [36, 72], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px) scale(${textScale})`,
          textAlign: "center",
          maxWidth: 1100,
          padding: "0 80px",
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.beige,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Struggle with outfit choices
          <br />
          every single day?
        </div>
      </div>
    </AbsoluteFill>
  );
};
