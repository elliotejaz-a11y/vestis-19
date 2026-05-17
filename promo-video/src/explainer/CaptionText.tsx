import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "./constants";

interface CaptionTextProps {
  text: string;
  appearFrame: number;
  exitFrame?: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
}

export const CaptionText: React.FC<CaptionTextProps> = ({
  text,
  appearFrame,
  exitFrame,
  fontSize = 52,
  color = COLORS.white,
  align = "center",
}) => {
  const frame = useCurrentFrame();

  const fadeInEnd = appearFrame + 36;
  const fadeOutStart = exitFrame ?? Infinity;
  const fadeOutEnd = fadeOutStart + 20;

  const opacity = interpolate(
    frame,
    [appearFrame, fadeInEnd, fadeOutStart, fadeOutEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const yOffset = interpolate(frame, [appearFrame, fadeInEnd], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${yOffset}px)`,
        fontFamily: FONT,
        fontSize,
        fontWeight: 700,
        color,
        textAlign: align,
        textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  );
};
