import React from "react";
import {
  PHONE_H,
  PHONE_RADIUS,
  PHONE_W,
  SCREEN_INSET,
  SCREEN_RADIUS,
} from "./constants";

interface ExplainerPhoneProps {
  children: React.ReactNode;
  rotateY?: number;
  rotateX?: number;
  scale?: number;
  opacity?: number;
  x?: number;
  y?: number;
}

export const ExplainerPhone: React.FC<ExplainerPhoneProps> = ({
  children,
  rotateY = 0,
  rotateX = 0,
  scale = 1,
  opacity = 1,
  x = 0,
  y = 0,
}) => {
  const screenW = PHONE_W - SCREEN_INSET * 2;
  const screenH = PHONE_H - SCREEN_INSET * 2;

  return (
    <div
      style={{
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
        transformStyle: "preserve-3d",
        opacity,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: PHONE_RADIUS,
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
        }}
      >
        {/* Frame specular highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: PHONE_RADIUS,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)",
            pointerEvents: "none",
            zIndex: 30,
          }}
        />

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
          {children}

          {/* Screen glass sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, transparent 38%)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        </div>

        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: SCREEN_INSET + 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: Math.round(PHONE_W * (122 / 440)),
            height: Math.round(PHONE_W * (36 / 440)),
            borderRadius: 20,
            background: "#040405",
            zIndex: 20,
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.07)",
          }}
        />

        {/* Volume mute */}
        <div style={{ position: "absolute", left: -3, top: 155, width: 3.5, height: 31, borderRadius: "2px 0 0 2px", background: "linear-gradient(90deg, #15151a, #28282c)" }} />
        {/* Volume down */}
        <div style={{ position: "absolute", left: -3, top: 200, width: 3.5, height: 62, borderRadius: "2px 0 0 2px", background: "linear-gradient(90deg, #15151a, #28282c)" }} />
        {/* Volume up */}
        <div style={{ position: "absolute", left: -3, top: 277, width: 3.5, height: 62, borderRadius: "2px 0 0 2px", background: "linear-gradient(90deg, #15151a, #28282c)" }} />
        {/* Power */}
        <div style={{ position: "absolute", right: -3, top: 228, width: 3.5, height: 78, borderRadius: "0 2px 2px 0", background: "linear-gradient(270deg, #15151a, #28282c)" }} />

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: SCREEN_INSET + 7,
            left: "50%",
            transform: "translateX(-50%)",
            width: 96,
            height: 4,
            borderRadius: 3,
            background: "rgba(0,0,0,0.22)",
            zIndex: 20,
          }}
        />
      </div>
    </div>
  );
};
