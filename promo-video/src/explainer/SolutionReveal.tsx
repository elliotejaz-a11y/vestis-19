import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from "remotion";
import {
  COLORS,
  FONT,
  PHONE_H,
  PHONE_RADIUS,
  PHONE_W,
  S3_F1_END,
  S3_F1_START,
  S3_F2_END,
  S3_F2_START,
  S3_F3_END,
  S3_F3_START,
  S3_LOGO_HOLD,
  S3_LOGO_START,
  SCREEN_INSET,
  SCREEN_RADIUS,
} from "./constants";
import { ExplainerPhone } from "./ExplainerPhone";

// Segment 3: 720–1200 frames (12–20 s), local frame 0–480
export const SolutionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Logo reveal ──────────────────────────────────────────────────────────────
  const logoSpring = spring({
    frame: Math.max(0, frame - S3_LOGO_START),
    fps,
    config: { damping: 130, stiffness: 80 },
    durationInFrames: 42,
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1.0]);
  const logoOpacity = interpolate(
    frame,
    [S3_LOGO_START, S3_LOGO_START + 24, S3_LOGO_HOLD + 60, S3_LOGO_HOLD + 90],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const taglineOpacity = interpolate(
    frame,
    [S3_LOGO_HOLD - 10, S3_LOGO_HOLD + 20, S3_LOGO_HOLD + 80, S3_LOGO_HOLD + 110],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Feature phones ───────────────────────────────────────────────────────────
  const makeFeatureAnim = (start: number, end: number) => {
    const sp = spring({
      frame: Math.max(0, frame - start),
      fps,
      config: { damping: 180, stiffness: 200 },
      durationInFrames: 24,
    });
    const scale = interpolate(sp, [0, 1], [0.85, 1.0]);
    const opacity = interpolate(
      frame,
      [start, start + 16, end - 20, end],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const x = interpolate(sp, [0, 1], [120, 0]);
    return { scale, opacity, x };
  };

  const f1 = makeFeatureAnim(S3_F1_START, S3_F1_END);
  const f2 = makeFeatureAnim(S3_F2_START, S3_F2_END);
  const f3 = makeFeatureAnim(S3_F3_START, S3_F3_END);

  // Feature label opacity
  const f1LabelOpacity = interpolate(frame, [S3_F1_START, S3_F1_START + 20, S3_F1_END - 16, S3_F1_END], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const f2LabelOpacity = interpolate(frame, [S3_F2_START, S3_F2_START + 20, S3_F2_END - 16, S3_F2_END], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const f3LabelOpacity = interpolate(frame, [S3_F3_START, S3_F3_START + 20, S3_F3_END - 16, S3_F3_END], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const screenW = PHONE_W - SCREEN_INSET * 2;
  const screenH = PHONE_H - SCREEN_INSET * 2;

  // Frames to skip into each recording to show the most interesting part
  // outfit-gen.mp4 is 45s — skip to ~22s to show generation result
  const OUTFIT_GEN_SKIP = 22 * 60;
  // outfit-builder.mp4 is 9.3s — skip 1s to skip any tap
  const BUILDER_SKIP = 60;
  // calendar.mp4 is 14.6s — skip 3s
  const CALENDAR_SKIP = 3 * 60;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>

      {/* ── Logo + Tagline (center stage, fades before features) ── */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Halo glow behind logo */}
        <div
          style={{
            position: "absolute",
            width: 800,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(248,241,231,0.30) 0%, transparent 70%)`,
            filter: "blur(50px)",
            opacity: logoOpacity,
          }}
        />

        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <Img
            src={staticFile("screenshots/vestis-logo.png")}
            style={{
              width: 520,
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

        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 300,
            color: COLORS.beige,
            letterSpacing: "0.08em",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            marginTop: -8,
          }}
        >
          Your wardrobe. Reimagined.
        </div>
      </AbsoluteFill>

      {/* ── Feature 1: AI Outfit Generator ── */}
      {(frame >= S3_F1_START - 2 && frame <= S3_F1_END + 2) && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 160,
            perspective: 1400,
          }}
        >
          <div style={{ opacity: f1LabelOpacity, position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)" }}>
            <FeatureLabel
              number="01"
              title="AI Outfit Generator"
              description="Describe the occasion. Get a complete look from your own wardrobe — instantly."
            />
          </div>
          <ExplainerPhone
            rotateY={-14}
            rotateX={3}
            scale={f1.scale}
            opacity={f1.opacity}
            x={f1.x}
          >
            <Video
              src={staticFile("videos/outfit-gen.mp4")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              startFrom={OUTFIT_GEN_SKIP}
              muted
            />
          </ExplainerPhone>
        </AbsoluteFill>
      )}

      {/* ── Feature 2: Outfit Builder ── */}
      {(frame >= S3_F2_START - 2 && frame <= S3_F2_END + 2) && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 160,
            perspective: 1400,
          }}
        >
          <div style={{ opacity: f2LabelOpacity, position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)" }}>
            <FeatureLabel
              number="02"
              title="Outfit Builder"
              description="Drag, drop, and remix your pieces. Build any look and save it for later."
            />
          </div>
          <ExplainerPhone
            rotateY={-14}
            rotateX={3}
            scale={f2.scale}
            opacity={f2.opacity}
            x={f2.x}
          >
            <Video
              src={staticFile("videos/outfit-builder.mp4")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              startFrom={BUILDER_SKIP}
              muted
            />
          </ExplainerPhone>
        </AbsoluteFill>
      )}

      {/* ── Feature 3: Outfit Calendar ── */}
      {(frame >= S3_F3_START - 2 && frame <= S3_F3_END + 2) && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 160,
            perspective: 1400,
          }}
        >
          <div style={{ opacity: f3LabelOpacity, position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)" }}>
            <FeatureLabel
              number="03"
              title="Outfit Calendar"
              description="Plan your looks days ahead. Never repeat an outfit unintentionally."
            />
          </div>
          <ExplainerPhone
            rotateY={-14}
            rotateX={3}
            scale={f3.scale}
            opacity={f3.opacity}
            x={f3.x}
          >
            <Video
              src={staticFile("videos/calendar.mp4")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              startFrom={CALENDAR_SKIP}
              muted
            />
          </ExplainerPhone>
        </AbsoluteFill>
      )}

    </AbsoluteFill>
  );
};

interface FeatureLabelProps {
  number: string;
  title: string;
  description: string;
}

const FeatureLabel: React.FC<FeatureLabelProps> = ({ number, title, description }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 18,
        fontWeight: 500,
        color: COLORS.burgundy,
        letterSpacing: "0.18em",
        textTransform: "uppercase" as const,
      }}
    >
      {number}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 58,
        fontWeight: 700,
        color: COLORS.beige,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 400,
        color: "rgba(248,241,231,0.75)",
        lineHeight: 1.5,
        textShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }}
    >
      {description}
    </div>
  </div>
);
