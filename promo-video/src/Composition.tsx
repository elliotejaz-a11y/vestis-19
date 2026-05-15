import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SceneTitle } from "./SceneTitle";
import { Phone, PHONE_HEIGHT, PHONE_WIDTH } from "./Phone";
import { TitleCard } from "./TitleCard";

// ─── Timeline (630 frames / 10.5 s @ 60 fps) ───────────────────────────────
//
//   0 –  55   Entry reveal
//  55 – 160   Screen 1 (Wardrobe) hold  (+30 vs old)
// 160 – 174   Flip OUT
// 174 – 202   Flip IN
// 202 – 312   Screen 2 (Calendar) hold  (+30 vs old, shifted +30)
// 312 – 328   Drop OFF
// 328 – 382   Slam IN  (shifted +60)
// 382 – 470   Screen 3 (Profile) hold   (+30 vs old, shifted +60)
// 470 – 492   Phone outro  (shifted +90)
// 475 – 630   TitleCard via <Sequence from={475}>  (shifted +90)
// 618 – 630   Final black fade

interface PhoneState {
  x: number; y: number; rotY: number; rotX: number; scale: number; opacity: number;
}

export const VestisPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Phone state machine ────────────────────────────────────────────────────
  const getPhone = (): PhoneState => {

    // Entry (0–55)
    if (frame < 55) {
      const sp = spring({ frame, fps, config: { damping: 128, stiffness: 65 }, durationInFrames: 55 });
      return {
        x: 0,
        y: interpolate(sp, [0, 1], [-200, 0]),
        rotY: interpolate(sp, [0, 1], [82, 12]),
        rotX: interpolate(sp, [0, 1], [-20, 4]),
        scale: interpolate(sp, [0, 1], [0.65, 1]),
        opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      };
    }

    // Wardrobe hold (55–160)
    if (frame < 160) {
      const e = frame - 55;
      return { x: 0, y: Math.sin(e * 0.088) * 13, rotY: 12 + Math.sin(e * 0.055) * 3, rotX: 4 + Math.sin(e * 0.072 + 1.3) * 1.5, scale: 1, opacity: 1 };
    }

    // Flip OUT (160–174)
    if (frame < 174) {
      const t = interpolate(frame, [160, 174], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
      const bobY = Math.sin((160 - 55) * 0.088) * 13;
      return { x: 0, y: interpolate(t, [0, 1], [bobY, bobY - 55]), rotY: interpolate(t, [0, 1], [12, 90]), rotX: 4, scale: 1, opacity: interpolate(t, [0.55, 1], [1, 0]) };
    }

    // Flip IN (174–202)
    if (frame < 202) {
      const f = frame - 174;
      const sp = spring({ frame: f, fps, config: { damping: 190, stiffness: 220 }, durationInFrames: 28 });
      const bobY = Math.sin((160 - 55) * 0.088) * 13;
      return {
        x: 0, y: interpolate(sp, [0, 1], [bobY - 55, 0]),
        rotY: interpolate(sp, [0, 1], [-90, -12]), rotX: interpolate(sp, [0, 1], [4, -2]),
        scale: 1, opacity: interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      };
    }

    // Calendar hold (202–312)
    if (frame < 312) {
      const e = frame - 202;
      return { x: 0, y: Math.sin(e * 0.082 + 0.9) * 13, rotY: -12 + Math.sin(e * 0.052) * 3, rotX: -2 + Math.sin(e * 0.068) * 1.5, scale: 1, opacity: 1 };
    }

    // Drop OFF (312–328)
    if (frame < 328) {
      const t = interpolate(frame, [312, 328], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
      const e = 312 - 202;
      const bobY = Math.sin(e * 0.082 + 0.9) * 13;
      return {
        x: 0, y: interpolate(t, [0, 1], [bobY, 1600]),
        rotY: interpolate(t, [0, 1], [-12, -6]), rotX: interpolate(t, [0, 1], [-2, 22]),
        scale: interpolate(t, [0, 1], [1, 0.90]), opacity: interpolate(t, [0.65, 1], [1, 0]),
      };
    }

    // Slam IN (328–382)
    if (frame < 382) {
      const f = frame - 328;
      const sp = spring({ frame: f, fps, config: { damping: 68, stiffness: 175 }, durationInFrames: 54 });
      return {
        x: 0, y: interpolate(sp, [0, 1], [-1050, 0]),
        rotY: interpolate(sp, [0, 1], [38, -26]), rotX: interpolate(sp, [0, 1], [-28, 2]),
        scale: interpolate(sp, [0, 1], [0.50, 1]),
        opacity: interpolate(f, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      };
    }

    // Profile hold (382–470)
    if (frame < 470) {
      const e = frame - 382;
      return { x: 0, y: Math.sin(e * 0.082 + 0.4) * 13, rotY: -26 + Math.sin(e * 0.052 + 0.7) * 3, rotX: 2 + Math.sin(e * 0.068 + 0.5) * 1.5, scale: 1, opacity: 1 };
    }

    // Outro (470–492)
    const t = interpolate(frame, [470, 492], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const e = 470 - 382;
    return {
      x: 0, y: interpolate(t, [0, 1], [Math.sin(e * 0.082 + 0.4) * 13, -130]),
      rotY: -26 + Math.sin(e * 0.052 + 0.7) * 3, rotX: 2 + Math.sin(e * 0.068 + 0.5) * 1.5,
      scale: interpolate(t, [0, 1], [1, 0.80]), opacity: interpolate(t, [0, 0.75], [1, 0]),
    };
  };

  const phone = getPhone();

  // ─── Screen cross-fades ─────────────────────────────────────────────────────
  const screen1Opacity = interpolate(frame, [16, 34, 152, 174], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screen2Opacity = interpolate(frame, [174, 190, 306, 322], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screen3Opacity = interpolate(frame, [328, 345, 462, 480], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ─── Streaks ────────────────────────────────────────────────────────────────
  const streak1 = interpolate(frame, [174, 202], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const streak2 = interpolate(frame, [328, 360], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ─── Impact flash + glow flare ───────────────────────────────────────────────
  const impactFlash = interpolate(frame, [327, 330, 344], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const glowPulse   = interpolate(frame, [327, 330, 350], [1, 2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });

  // ─── Ambient glow ────────────────────────────────────────────────────────────
  const baseGlowOpacity = interpolate(frame, [0, 40, 200, 328, 330, 410, 470, 630], [0.32, 0.52, 0.30, 0.30, 0.80, 0.48, 0.36, 0.15]);
  const glowX = interpolate(frame, [0, 470], [-72, 95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowFollowY = phone.opacity > 0.05 ? phone.y * 0.25 : 0;

  // ─── Final fade ──────────────────────────────────────────────────────────────
  const finalFade = interpolate(frame, [618, 630], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneCenterOffsetY = -40;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, #1a0407 0%, #0a0102 52%, #000000 100%)" }}>

      {/* ── Primary burgundy glow ── */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 920, height: 920, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(123,36,50,1) 0%, rgba(123,36,50,0) 65%)",
          filter: "blur(55px)",
          opacity: baseGlowOpacity * glowPulse,
          transform: `translate(${glowX}px, ${phoneCenterOffsetY + glowFollowY}px)`,
        }} />
      </AbsoluteFill>

      {/* ── Warm-beige secondary glow ── */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(248,241,231,0.55) 0%, transparent 68%)",
          filter: "blur(90px)",
          opacity: interpolate(frame, [0, 202, 328, 330, 355, 470, 630], [0.10, 0.22, 0.10, 0.60, 0.18, 0.10, 0.05]),
          transform: `translate(${-glowX * 0.38}px, ${phoneCenterOffsetY + 210}px)`,
        }} />
      </AbsoluteFill>

      {/* ── Phone ── */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", perspective: 1400, perspectiveOrigin: "50% 50%" }}>
        <div style={{
          transform: `translate(${phone.x}px, ${phone.y + phoneCenterOffsetY}px) scale(${phone.scale}) rotateY(${phone.rotY}deg) rotateX(${phone.rotX}deg)`,
          transformStyle: "preserve-3d",
          opacity: phone.opacity,
        }}>
          <Phone screen1Opacity={screen1Opacity} screen2Opacity={screen2Opacity} screen3Opacity={screen3Opacity} streak1={streak1} streak2={streak2} />
        </div>
      </AbsoluteFill>

      {/* ── Floor reflection ── */}
      {phone.opacity > 0.05 && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", perspective: 1400, perspectiveOrigin: "50% 50%", pointerEvents: "none" }}>
          <div style={{
            transform: `translate(${phone.x}px, ${phone.y + phoneCenterOffsetY + PHONE_HEIGHT + 6}px) scale(${phone.scale}) rotateY(${phone.rotY}deg) rotateX(${phone.rotX}deg) scaleY(-1)`,
            width: PHONE_WIDTH, height: PHONE_HEIGHT, borderRadius: 58,
            background: "rgba(123,36,50,0.12)", filter: "blur(5px)",
            opacity: phone.opacity * 0.08,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 48%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 48%)",
          }} />
        </AbsoluteFill>
      )}

      {/* ── Impact flash ── */}
      {impactFlash > 0 && (
        <AbsoluteFill style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(248,241,231,0.95) 0%, rgba(123,36,50,0.4) 45%, transparent 70%)",
          opacity: impactFlash, pointerEvents: "none",
        }} />
      )}

      {/* ── Scene titles ── */}
      <SceneTitle
        eyebrow="Your" title="Wardrobe" subtitle="66 pieces · 1 saved outfit"
        fadeInStart={36} fadeOutStart={150} fadeOutEnd={170}
      />
      <SceneTitle
        eyebrow="Outfit" title="Calendar" subtitle="Plan looks & track what you've worn"
        fadeInStart={212} fadeOutStart={302} fadeOutEnd={322}
      />
      <SceneTitle
        eyebrow="Your" title="Profile" subtitle="@elliot · $10,045 wardrobe value"
        fadeInStart={392} fadeOutStart={458} fadeOutEnd={478}
      />

      {/* ── Cinematic vignette ── */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 50%, transparent 32%, rgba(0,0,0,0.72) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Title card at the end ── */}
      <Sequence from={475} durationInFrames={155}>
        <TitleCard />
      </Sequence>

      {/* ── Final black fade ── */}
      <AbsoluteFill style={{ background: "#000000", opacity: finalFade, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
