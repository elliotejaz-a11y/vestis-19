import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "./constants";

interface TextBadgeProps {
  label: string;
  enterFrame: number;
  exitFrame: number;
}

export const TextBadge: React.FC<TextBadgeProps> = ({
  label,
  enterFrame,
  exitFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localEnter = Math.max(0, frame - enterFrame);
  const enterSpring = spring({
    frame: localEnter,
    fps,
    config: { damping: 200, stiffness: 300 },
    durationInFrames: 12,
  });

  const xIn = interpolate(enterSpring, [0, 1], [-340, 0]);
  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + 8, exitFrame, exitFrame + 8],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        transform: `translateX(${xIn}px)`,
        opacity,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 20px",
        borderRadius: 20,
        background: `rgba(13,35,57,0.55)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(248,241,231,0.12)",
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 500,
        color: COLORS.beige,
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {label}
    </div>
  );
};
