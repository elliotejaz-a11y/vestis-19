import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface LabelProps {
  text: string;
  fadeInStart: number;
  fadeInEnd: number;
  fadeOutStart: number;
  fadeOutEnd: number;
}

export const Label: React.FC<LabelProps> = ({
  text,
  fadeInStart,
  fadeInEnd,
  fadeOutStart,
  fadeOutEnd,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const floatSpring = spring({
    frame: Math.max(0, frame - fadeInStart),
    fps,
    config: { damping: 220, stiffness: 75 },
    durationInFrames: 40,
  });
  const translateY = interpolate(floatSpring, [0, 1], [20, 0]);

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "9%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        {/* Left rule */}
        <div
          style={{
            width: 72,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(248,241,231,0.45))",
          }}
        />

        <span
          style={{
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: "0.20em",
            color: "rgba(248,241,231,0.92)",
            textTransform: "uppercase" as const,
            whiteSpace: "nowrap" as const,
          }}
        >
          {text}
        </span>

        {/* Right rule */}
        <div
          style={{
            width: 72,
            height: 1,
            background:
              "linear-gradient(270deg, transparent, rgba(248,241,231,0.45))",
          }}
        />
      </div>
    </div>
  );
};
