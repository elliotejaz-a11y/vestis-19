import React from "react";
import { Img, interpolate, staticFile } from "remotion";

export const PHONE_WIDTH = 440;
export const PHONE_HEIGHT = 955;
const FRAME_RADIUS = 58;
const SCREEN_INSET = 10;
const SCREEN_RADIUS = 50;

interface PhoneProps {
  screen1Opacity: number;
  screen2Opacity: number;
  screen3Opacity: number;
  streak1: number; // 0→1 progress of wipe on 1→2 transition
  streak2: number; // 0→1 progress of wipe on 2→3 transition
}

export const Phone: React.FC<PhoneProps> = ({
  screen1Opacity,
  screen2Opacity,
  screen3Opacity,
  streak1,
  streak2,
}) => {
  const screenW = PHONE_WIDTH - SCREEN_INSET * 2;
  const screenH = PHONE_HEIGHT - SCREEN_INSET * 2;

  // Streak center moves from -50% to 150% of screen width
  const streak1X = `${interpolate(streak1, [0, 1], [-50, 150])}%`;
  const streak2X = `${interpolate(streak2, [0, 1], [-50, 150])}%`;

  return (
    <div
      style={{
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        borderRadius: FRAME_RADIUS,
        background:
          "linear-gradient(158deg, #2e2e32 0%, #1c1c1e 35%, #0f0f11 100%)",
        boxShadow: [
          "0 0 0 1.5px rgba(255,255,255,0.13)",
          "0 70px 160px rgba(0,0,0,0.95)",
          "0 30px 70px rgba(0,0,0,0.65)",
          "inset 0 1.5px 1px rgba(255,255,255,0.09)",
          "inset 0 -1px 1px rgba(0,0,0,0.35)",
        ].join(","),
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Frame specular highlight — left & top edge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: FRAME_RADIUS,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)",
          pointerEvents: "none",
          zIndex: 30,
        }}
      />

      {/* ── Screen ── */}
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
        {/* Screen 1: Wardrobe */}
        <div style={{ position: "absolute", inset: 0, opacity: screen1Opacity }}>
          <Img
            src={staticFile("wardrobe.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
          />
        </div>

        {/* Screen 2: Calendar
            The screenshot has no iOS status bar, so "Outfit Calendar" text
            sits at the very top pixel and is hidden behind the Dynamic Island.
            We offset the image container 62px down — the exposed gap is filled
            by the matching beige screen background (#F8F1E7). */}
        <div style={{ position: "absolute", inset: 0, opacity: screen2Opacity }}>
          <div
            style={{
              position: "absolute",
              top: 62,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("calendar.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
                display: "block",
              }}
            />
          </div>
        </div>

        {/* Screen 3: Profile */}
        <div style={{ position: "absolute", inset: 0, opacity: screen3Opacity }}>
          <Img
            src={staticFile("profile.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
          />
        </div>

        {/* Light streak — transition 1→2 */}
        {streak1 > 0 && streak1 < 1 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: streak1X,
              transform: "translateX(-50%)",
              width: "35%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Light streak — transition 2→3 */}
        {streak2 > 0 && streak2 < 1 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: streak2X,
              transform: "translateX(-50%)",
              width: "35%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Screen glass sheen */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, transparent 38%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Dynamic Island */}
      <div
        style={{
          position: "absolute",
          top: SCREEN_INSET + 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 122,
          height: 36,
          borderRadius: 22,
          background: "#040405",
          zIndex: 20,
          boxShadow: "0 0 0 0.5px rgba(255,255,255,0.07)",
        }}
      />

      {/* Volume mute button */}
      <div
        style={{
          position: "absolute",
          left: -3.5,
          top: 180,
          width: 4,
          height: 36,
          borderRadius: "2px 0 0 2px",
          background: "linear-gradient(90deg, #15151a, #28282c)",
          boxShadow: "-1px 0 3px rgba(0,0,0,0.5)",
        }}
      />
      {/* Volume down */}
      <div
        style={{
          position: "absolute",
          left: -3.5,
          top: 234,
          width: 4,
          height: 72,
          borderRadius: "2px 0 0 2px",
          background: "linear-gradient(90deg, #15151a, #28282c)",
          boxShadow: "-1px 0 3px rgba(0,0,0,0.5)",
        }}
      />
      {/* Volume up */}
      <div
        style={{
          position: "absolute",
          left: -3.5,
          top: 322,
          width: 4,
          height: 72,
          borderRadius: "2px 0 0 2px",
          background: "linear-gradient(90deg, #15151a, #28282c)",
          boxShadow: "-1px 0 3px rgba(0,0,0,0.5)",
        }}
      />

      {/* Power button */}
      <div
        style={{
          position: "absolute",
          right: -3.5,
          top: 265,
          width: 4,
          height: 90,
          borderRadius: "0 2px 2px 0",
          background: "linear-gradient(270deg, #15151a, #28282c)",
          boxShadow: "1px 0 3px rgba(0,0,0,0.5)",
        }}
      />

      {/* Home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: SCREEN_INSET + 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 112,
          height: 5,
          borderRadius: 3,
          background: "rgba(0,0,0,0.22)",
          zIndex: 20,
        }}
      />
    </div>
  );
};
