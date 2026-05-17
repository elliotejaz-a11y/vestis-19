import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  COLORS,
  FONT,
  S4_CAPTION1,
  S4_CAPTION2,
  S4_CAPTION3,
  S4_CTA,
  S4_FADE_START,
} from "./constants";
import { CaptionText } from "./CaptionText";

// Segment 4: 1200–1800 frames (20–30 s), local frame 0–600
export const CTASection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 130, stiffness: 80 },
    durationInFrames: 48,
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.65, 1.0]);
  const logoOpacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Feature badges orbiting the logo
  const badgeEnter = (delay: number) => {
    const sp = spring({
      frame: Math.max(0, frame - (30 + delay)),
      fps,
      config: { damping: 200, stiffness: 220 },
      durationInFrames: 18,
    });
    return interpolate(sp, [0, 1], [0.5, 1]);
  };
  const b1s = badgeEnter(0);
  const b2s = badgeEnter(10);
  const b3s = badgeEnter(20);

  const badgeOpacity = (delay: number) =>
    interpolate(frame, [30 + delay, 50 + delay], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // CTA button
  const ctaSpring = spring({
    frame: Math.max(0, frame - S4_CTA),
    fps,
    config: { damping: 180, stiffness: 200 },
    durationInFrames: 24,
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.7, 1.0]);
  const ctaOpacity = interpolate(frame, [S4_CTA, S4_CTA + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA glow pulse
  const ctaGlow = 1 + Math.sin(frame * 0.08) * 0.15;

  // Final fade-out of all elements before the global black fade
  const sectionOpacity = interpolate(
    frame,
    [S4_FADE_START, S4_FADE_START + 50],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity: sectionOpacity,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }}
    >
      {/* Warm bloom */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(123,36,50,0.40) 0%, rgba(248,241,231,0.10) 50%, transparent 80%)`,
          filter: "blur(70px)",
          opacity: logoOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 32,
        }}
      >
        <Img
          src={staticFile("screenshots/vestis-logo.png")}
          style={{
            width: 460,
            height: "auto",
            filter: [
              "brightness(3.0)",
              "contrast(1.05)",
              "drop-shadow(0 0 40px rgba(248,241,231,0.55))",
              "drop-shadow(0 0 16px rgba(248,241,231,0.35))",
            ].join(" "),
          }}
        />
      </div>

      {/* Feature badges row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 20,
          marginBottom: 52,
          alignItems: "center",
        }}
      >
        <CtaBadge label="✨ AI Styling" scale={b1s} opacity={badgeOpacity(0)} />
        <CtaBadge label="👗 Wardrobe Management" scale={b2s} opacity={badgeOpacity(10)} />
        <CtaBadge label="📅 Outfit Calendar" scale={b3s} opacity={badgeOpacity(20)} />
      </div>

      {/* Animated captions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginBottom: 52,
        }}
      >
        <CaptionText
          text="Stop wasting time."
          appearFrame={S4_CAPTION1}
          exitFrame={S4_FADE_START}
          fontSize={52}
          color={COLORS.beige}
        />
        <CaptionText
          text="Start expressing yourself."
          appearFrame={S4_CAPTION2}
          exitFrame={S4_FADE_START}
          fontSize={52}
          color={COLORS.beige}
        />
        <CaptionText
          text="Download Vestis today."
          appearFrame={S4_CAPTION3}
          exitFrame={S4_FADE_START}
          fontSize={52}
          color={COLORS.burgundy}
        />
      </div>

      {/* CTA Button */}
      <div
        style={{
          transform: `scale(${ctaScale * ctaGlow})`,
          opacity: ctaOpacity,
          position: "relative",
        }}
      >
        {/* Glow halo */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: 60,
            background: `radial-gradient(ellipse, rgba(123,36,50,0.55) 0%, transparent 70%)`,
            filter: "blur(20px)",
            opacity: ctaOpacity,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 48px",
            borderRadius: 52,
            background: COLORS.burgundy,
            boxShadow: "0 8px 40px rgba(123,36,50,0.55), 0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {/* Apple logo SVG */}
          <svg width="28" height="28" viewBox="0 0 814 1000" fill="white">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 270-317.3 70.1 0 128.2 42.5 170.6 42.5 41.1 0 106.4-45 186.6-45 30.3 0 108.2 2.6 168.6 73.8zm-137.6-80.9c34.2-40.3 58.4-96.1 58.4-151.9 0-7.8-.6-15.6-2-22.8-55.2 2-120.9 36.7-162.3 82.6-31.6 36.1-59.8 93.7-59.8 150.9 0 8.8 1.4 17 2 19.9 3.4.6 8.8 1.4 14.2 1.4 49.5 0 110.6-33.2 149.5-80.1z"/>
          </svg>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 30,
              fontWeight: 600,
              color: COLORS.white,
              letterSpacing: "0.01em",
            }}
          >
            Download on iOS
          </span>
        </div>
      </div>

    </AbsoluteFill>
  );
};

interface CtaBadgeProps {
  label: string;
  scale: number;
  opacity: number;
}

const CtaBadge: React.FC<CtaBadgeProps> = ({ label, scale, opacity }) => (
  <div
    style={{
      transform: `scale(${scale})`,
      opacity,
      display: "inline-flex",
      alignItems: "center",
      padding: "10px 20px",
      borderRadius: 20,
      background: "rgba(13,35,57,0.5)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(248,241,231,0.15)",
      fontFamily: FONT,
      fontSize: 22,
      fontWeight: 500,
      color: COLORS.beige,
      whiteSpace: "nowrap" as const,
    }}
  >
    {label}
  </div>
);
