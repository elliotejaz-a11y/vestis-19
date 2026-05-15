import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface SceneTitleProps {
  eyebrow: string;   // small word above — e.g. "YOUR"
  title: string;     // big featured word — e.g. "WARDROBE"
  subtitle: string;  // fine print below the line
  fadeInStart: number;
  fadeOutStart: number;
  fadeOutEnd: number;
}

export const SceneTitle: React.FC<SceneTitleProps> = ({
  eyebrow,
  title,
  subtitle,
  fadeInStart,
  fadeOutStart,
  fadeOutEnd,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < fadeInStart || frame > fadeOutEnd) return null;

  const local = frame - fadeInStart;

  // Whole block fades out together
  const blockOpacity = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Eyebrow: slides up out of clipping slot ──────────────────────────────
  const eyebrowSp = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 220, stiffness: 200 },
    durationInFrames: 22,
  });
  const eyebrowY = interpolate(eyebrowSp, [0, 1], [58, 0]);
  const eyebrowOpacity = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Title: slides up, slightly later, with more overshoot ───────────────
  const titleSp = spring({
    frame: Math.max(0, local - 10),
    fps,
    config: { damping: 145, stiffness: 155 },
    durationInFrames: 32,
  });
  const titleY = interpolate(titleSp, [0, 1], [130, 0]);
  const titleOpacity = interpolate(local, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Underline: sweeps left-to-right after title lands ──────────────────
  const lineProgress = interpolate(local, [28, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Subtitle: fades up after line ──────────────────────────────────────
  const subtitleSp = spring({
    frame: Math.max(0, local - 40),
    fps,
    config: { damping: 200, stiffness: 90 },
    durationInFrames: 28,
  });
  const subtitleY = interpolate(subtitleSp, [0, 1], [18, 0]);
  const subtitleOpacity = interpolate(local, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontStack =
    "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";

  return (
    <div
      style={{
        position: "absolute",
        top: "6%",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: blockOpacity,
        pointerEvents: "none",
        gap: 0,
      }}
    >
      {/* ── Eyebrow ── */}
      <div style={{ overflow: "hidden", paddingBottom: 6 }}>
        <div
          style={{
            transform: `translateY(${eyebrowY}px)`,
            opacity: eyebrowOpacity,
            fontFamily: fontStack,
            fontSize: 34,
            fontWeight: 300,
            letterSpacing: "0.38em",
            textTransform: "uppercase" as const,
            color: "rgba(248,241,231,0.60)",
            lineHeight: 1,
            paddingRight: "0.38em",
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* ── Big title word ── */}
      <div style={{ overflow: "hidden", paddingBottom: 8 }}>
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontFamily: fontStack,
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: "0.03em",
            textTransform: "uppercase" as const,
            lineHeight: 0.93,
            paddingRight: "0.03em",
            // Gradient fill: warm ivory → rose-cream
            background:
              "linear-gradient(138deg, #F8F1E7 25%, rgba(215,190,178,0.92) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          } as React.CSSProperties}
        >
          {title}
        </div>
      </div>

      {/* ── Burgundy underline sweep ── */}
      <div
        style={{
          width: 560,
          height: 2.5,
          marginTop: 14,
          borderRadius: 2,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${lineProgress * 100}%`,
            background:
              "linear-gradient(90deg, #7B2432 0%, rgba(248,241,231,0.75) 65%, transparent 100%)",
            transformOrigin: "left center",
          }}
        />
      </div>

      {/* ── Subtitle ── */}
      <div
        style={{
          marginTop: 18,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity * 0.7,
          fontFamily: fontStack,
          fontSize: 20,
          fontWeight: 300,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: "rgba(248,241,231,0.85)",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
