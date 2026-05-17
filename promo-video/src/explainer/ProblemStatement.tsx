import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLORS, FONT, PHONE_H, PHONE_RADIUS, PHONE_W, SCREEN_INSET, SCREEN_RADIUS } from "./constants";
import { TextBadge } from "./TextBadge";

// Segment 2: 360–720 frames (6–12 s), local frame 0–360
export const ProblemStatement: React.FC = () => {
  const frame = useCurrentFrame();

  // Three screenshots cycle: wardrobe (0–120), outfit-gen (120–240), calendar (240–360)
  const wardrobeOpacity = interpolate(frame, [0, 20, 100, 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outfitOpacity   = interpolate(frame, [120, 140, 220, 240], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calendarOpacity = interpolate(frame, [240, 260, 340, 360], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Desaturation overlay on screens
  const screenW = PHONE_W - SCREEN_INSET * 2;
  const screenH = PHONE_H - SCREEN_INSET * 2;

  // Badge enter/exit (local frames). Enter staggered, all exit at 320
  // Badge 1: enter 20, Badge 2: enter 28, Badge 3: enter 36
  const BADGE_EXIT = 320;

  // Phone bob animation
  const phoneY = Math.sin(frame * 0.08) * 10;
  const phoneRotY = 8 + Math.sin(frame * 0.05) * 3;

  const phoneOpacity = interpolate(frame, [0, 20, 330, 360], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Section heading
  const headingOpacity = interpolate(frame, [0, 25, 320, 360], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", pointerEvents: "none" }}>

      {/* Left side: heading + badges */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 0,
          bottom: 0,
          width: 680,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            opacity: headingOpacity,
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.beige,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
            marginBottom: 12,
          }}
        >
          Getting dressed shouldn't
          <br />
          be this hard.
        </div>

        <TextBadge label="⏱  Time-consuming" enterFrame={20} exitFrame={BADGE_EXIT} />
        <TextBadge label="🤔  Outfit indecision" enterFrame={28} exitFrame={BADGE_EXIT} />
        <TextBadge label="📅  No planning system" enterFrame={36} exitFrame={BADGE_EXIT} />
      </div>

      {/* Right side: phone with cycling app screens */}
      <div
        style={{
          position: "absolute",
          right: 160,
          top: "50%",
          transform: `translateY(-50%) translateY(${phoneY}px) rotateY(${phoneRotY}deg)`,
          transformStyle: "preserve-3d",
          opacity: phoneOpacity,
        }}
      >
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: PHONE_RADIUS,
            background: "linear-gradient(158deg, #2e2e32 0%, #1c1c1e 35%, #0f0f11 100%)",
            boxShadow: [
              "0 0 0 1.5px rgba(255,255,255,0.13)",
              "0 70px 160px rgba(0,0,0,0.95)",
              "0 30px 70px rgba(0,0,0,0.65)",
            ].join(","),
            position: "relative",
          }}
        >
          {/* Frame highlight */}
          <div style={{ position: "absolute", inset: 0, borderRadius: PHONE_RADIUS, background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 30%)", pointerEvents: "none", zIndex: 30 }} />

          {/* Screen */}
          <div
            style={{
              position: "absolute",
              top: SCREEN_INSET,
              left: SCREEN_INSET,
              width: screenW,
              height: screenH,
              borderRadius: SCREEN_RADIUS,
              overflow: "hidden",
              background: "#F8F1E7",
            }}
          >
            <div style={{ position: "absolute", inset: 0, opacity: wardrobeOpacity }}>
              <Img src={staticFile("screenshots/wardrobe.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
              {/* Desaturation + confused overlay */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(13,35,57,0.15)", mixBlendMode: "multiply" }} />
            </div>

            <div style={{ position: "absolute", inset: 0, opacity: outfitOpacity }}>
              <Img src={staticFile("screenshots/outfit-gen.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(13,35,57,0.15)", mixBlendMode: "multiply" }} />
            </div>

            <div style={{ position: "absolute", inset: 0, opacity: calendarOpacity }}>
              <Img src={staticFile("screenshots/calendar.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(13,35,57,0.10)", mixBlendMode: "multiply" }} />
            </div>

            {/* Glass sheen */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, transparent 38%)", pointerEvents: "none", zIndex: 10 }} />
          </div>

          {/* Dynamic Island */}
          <div style={{ position: "absolute", top: SCREEN_INSET + 12, left: "50%", transform: "translateX(-50%)", width: 105, height: 31, borderRadius: 18, background: "#040405", zIndex: 20 }} />

          {/* Home indicator */}
          <div style={{ position: "absolute", bottom: SCREEN_INSET + 7, left: "50%", transform: "translateX(-50%)", width: 96, height: 4, borderRadius: 3, background: "rgba(0,0,0,0.22)", zIndex: 20 }} />
        </div>
      </div>

    </AbsoluteFill>
  );
};
