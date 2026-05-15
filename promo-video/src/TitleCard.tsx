import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// TitleCard runs inside a <Sequence> so useCurrentFrame() is already local (0-based).
// At local frame 0 the card starts; it fades in and holds. The parent Composition
// handles the final black fade at the very end.

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade the whole card in — no fade out (parent controls final black)
  const cardOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo springs up from below
  const logoSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 130, stiffness: 80 },
    durationInFrames: 42,
  });
  const logoY = interpolate(logoSpring, [0, 1], [100, 0]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(frame, [4, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Separator extends outward
  const sepW = interpolate(frame, [22, 58], [0, 560], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  // Subtitle 1
  const sub1Spring = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: { damping: 200, stiffness: 76 },
    durationInFrames: 32,
  });
  const sub1Y = interpolate(sub1Spring, [0, 1], [30, 0]);
  const sub1Opacity = interpolate(frame, [38, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle 2 — staggered
  const sub2Spring = spring({
    frame: Math.max(0, frame - 52),
    fps,
    config: { damping: 200, stiffness: 76 },
    durationInFrames: 32,
  });
  const sub2Y = interpolate(sub2Spring, [0, 1], [30, 0]);
  const sub2Opacity = interpolate(frame, [52, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: cardOpacity,
        pointerEvents: "none",
        gap: 0,
      }}
    >
      {/* Warm bloom behind logo for contrast */}
      <div
        style={{
          position: "absolute",
          width: 780,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(248,241,231,0.28) 0%, rgba(248,241,231,0) 70%)",
          filter: "blur(38px)",
          transform: `translateY(${logoY * 0.6}px)`,
          opacity: logoOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `translateY(${logoY}px) scale(${logoScale})`,
          opacity: logoOpacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 660,
            height: "auto",
            display: "block",
            filter: [
              "brightness(3.2)",
              "contrast(1.05)",
              "saturate(1.15)",
              "drop-shadow(0 0 48px rgba(248,241,231,0.55))",
              "drop-shadow(0 0 18px rgba(248,241,231,0.35))",
            ].join(" "),
          }}
        />
      </div>

      {/* Separator */}
      <div
        style={{
          width: sepW,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(248,241,231,0.35) 50%, transparent 100%)",
          marginTop: 28,
          marginBottom: 32,
        }}
      />

      {/* Subtitles */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            transform: `translateY(${sub1Y}px)`,
            opacity: sub1Opacity,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
            color: "rgba(248,241,231,0.95)",
          }}
        >
          World's First Free
        </div>
        <div
          style={{
            transform: `translateY(${sub2Y}px)`,
            opacity: sub2Opacity,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
            color: "rgba(230,205,195,0.92)",
          }}
        >
          Digital AI Stylist &amp; Wardrobe
        </div>
      </div>
    </AbsoluteFill>
  );
};
