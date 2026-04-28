import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  CSSProperties,
} from "react";

const LOGO_CROP = "/vestis-launch/logo-crop.png";
const IMG_OUTFIT = "/vestis-launch/outfit.png";
const IMG_CALENDAR = "/vestis-launch/calendar.png";
const IMG_WARDROBE = "/vestis-launch/wardrobe.png";

const DURATION = 25;
const W = 405;
const H = 720;

// ── Easing ────────────────────────────────────────────────────────────────────
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const prog = (t: number, s: number, e: number) => clamp01((t - s) / (e - s));
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
const eOut4 = (t: number) => 1 - Math.pow(1 - t, 4);
const eOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const eOutElastic = (t: number) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Stage + scrubber ──────────────────────────────────────────────────────────
const TimeCtx = createContext(0);
const useTime = () => useContext(TimeCtx);

function Stage({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pausedAtRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now() - pausedAtRef.current * 1000;
    const tick = (now: number) => {
      const t = Math.min((now - startRef.current) / 1000, DURATION);
      setTime(t);
      if (t < DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        pausedAtRef.current = DURATION;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const togglePlay = () => {
    if (playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      pausedAtRef.current = time;
      setPlaying(false);
    } else {
      if (time >= DURATION) {
        pausedAtRef.current = 0;
        setTime(0);
      }
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newT = x * DURATION;
    pausedAtRef.current = newT;
    setTime(newT);
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / (H + 56));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div
        style={{
          width: W * scale,
          height: H * scale,
          position: "relative",
          overflow: "hidden",
          borderRadius: 16 * scale,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
          }}
        >
          <TimeCtx.Provider value={time}>{children}</TimeCtx.Provider>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          width: W * scale,
          padding: `${8 * scale}px 0 0`,
          display: "flex",
          flexDirection: "column",
          gap: 8 * scale,
        }}
      >
        {/* Scrubber */}
        <div
          onClick={seek}
          style={{
            height: 4 * scale,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 99,
            cursor: "pointer",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${(time / DURATION) * 100}%`,
              background: "#7D1A1A",
              borderRadius: 99,
            }}
          />
        </div>

        {/* Play/pause + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
          <button
            onClick={togglePlay}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 99,
              color: "#FFFFFF",
              width: 32 * scale,
              height: 32 * scale,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14 * scale,
              flexShrink: 0,
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <span
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 11 * scale,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {Math.floor(time)}s / {DURATION}s
          </span>
          <button
            onClick={() => {
              pausedAtRef.current = 0;
              setTime(0);
              setPlaying(true);
            }}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 99,
              color: "rgba(255,255,255,0.5)",
              padding: `${4 * scale}px ${10 * scale}px`,
              cursor: "pointer",
              fontSize: 10 * scale,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            ↺ Restart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Typed text helper ─────────────────────────────────────────────────────────
function Typed({
  text,
  t,
  startAt,
  speed = 20,
  style = {},
  showCursor = true,
}: {
  text: string;
  t: number;
  startAt: number;
  speed?: number;
  style?: CSSProperties;
  showCursor?: boolean;
}) {
  const chars = Math.floor(prog(t, startAt, startAt + text.length / speed) * text.length);
  const done = chars >= text.length;
  return (
    <span style={style}>
      {text.slice(0, chars)}
      {showCursor && !done && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "0.85em",
            background: "currentColor",
            marginLeft: 2,
            verticalAlign: "middle",
            opacity: 1,
            animation: "cursorBlink 0.7s steps(1) infinite",
          }}
        />
      )}
    </span>
  );
}

// ── Flash cut ─────────────────────────────────────────────────────────────────
function FlashCut({ at, duration = 0.1 }: { at: number; duration?: number }) {
  const t = useTime();
  const p = prog(t, at, at + duration);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#FFFFFF",
        opacity: 1 - p,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}

// ── Slide wipe ────────────────────────────────────────────────────────────────
function SlideWipe({ at, color = "#7D1A1A" }: { at: number; color?: string }) {
  const t = useTime();
  const inP = eOut4(prog(t, at, at + 0.2));
  const outP = eOut4(prog(t, at + 0.2, at + 0.4));
  if (inP <= 0) return null;
  const x = lerp(100, 0, inP) - lerp(0, 100, outP);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: color,
        transform: `translateX(${x}%)`,
        pointerEvents: "none",
        zIndex: 99,
      }}
    />
  );
}

// ── SCENE 1: Logo Reveal 0–3.4s ──────────────────────────────────────────────
function Scene01() {
  const t = useTime();
  if (t >= 3.4) return null;

  const logoP = eOutElastic(prog(t, 0.1, 1.3));
  const lineP = eOut4(prog(t, 0.0, 0.5));
  const tagP = eOut(prog(t, 1.0, 1.8));
  const exitP = eOut4(prog(t, 2.9, 3.4));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#EDEAE3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: 1 - exitP,
        transform: exitP > 0 ? `scale(${1 + exitP * 0.06})` : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.045) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "#7D1A1A",
          transform: `scaleX(${lineP})`,
          transformOrigin: "left",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "#7D1A1A",
          transform: `scaleX(${lineP})`,
          transformOrigin: "right",
        }}
      />
      <div
        style={{
          transform: `scale(${lerp(0.4, 1, logoP)}) rotate(${lerp(-8, 0, logoP)}deg)`,
          opacity: Math.min(1, logoP * 1.5),
          marginBottom: 28,
          zIndex: 1,
          filter: "drop-shadow(0 24px 48px rgba(125,26,26,0.25))",
        }}
      >
        <img src={LOGO_CROP} alt="Vestis" style={{ height: 96, width: "auto" }} />
      </div>
      <div
        style={{
          opacity: tagP,
          transform: `translateY(${lerp(18, 0, tagP)}px)`,
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "4px",
            textTransform: "uppercase",
            color: "#7D1A1A",
            textAlign: "center",
          }}
        >
          Your wardrobe. Reimagined.
        </p>
      </div>
    </div>
  );
}

// ── SCENE 2: Headline 3.4–7.8s ───────────────────────────────────────────────
function Scene02() {
  const t = useTime();
  if (t < 3.0 || t >= 7.8) return null;

  const eyeP = eOut(prog(t, 3.4, 4.0));
  const w1P = eOut4(prog(t, 3.4, 4.0));
  const w2P = eOut4(prog(t, 3.7, 4.3));
  const w3P = eOut4(prog(t, 4.0, 4.6));
  const exitP = eOut4(prog(t, 7.1, 7.8));

  const words = [
    { text: "Your", p: w1P, color: "#FFFFFF" },
    { text: "wardrobe,", p: w2P, color: "#FFFFFF" },
    { text: "reimagined.", p: w3P, color: "#E8A89A" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#0E0E1A",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 48px",
        opacity: 1 - exitP,
        transform: exitP > 0 ? `translateX(${exitP * -50}px)` : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: "#7D1A1A",
          marginBottom: 22,
          opacity: eyeP,
          zIndex: 1,
          transform: `translateY(${lerp(12, 0, eyeP)}px)`,
        }}
      >
        May 4th, 2026
      </p>

      <div style={{ zIndex: 1, height: "500px", textAlign: "left" }}>
        {words.map(({ text, p, color }) => (
          <div
            key={text}
            style={{ overflow: "hidden", padding: "0px", width: "200px", fontSize: "70px", fontWeight: "800" }}
          >
            <h1
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 900,
                color,
                lineHeight: 1.02,
                letterSpacing: "-3px",
                transform: `translateY(${lerp(110, 0, p)}px)`,
                display: "block",
                width: "30px",
                fontSize: "30px",
              }}
            >
              {text}
            </h1>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, zIndex: 1, minHeight: 22 }}>
        <Typed
          text="AI styling · Digital wardrobe · Outfit calendar"
          t={t}
          startAt={4.6}
          speed={22}
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.3px",
          }}
        />
      </div>
    </div>
  );
}

// ── SCENE 3–5: Feature Scenes ─────────────────────────────────────────────────
interface FeatureSceneProps {
  enterAt: number;
  exitAt: number;
  tag: string;
  lines: string[];
  desc: string;
  img: string;
  accent: string;
  dark: boolean;
}

function FeatureScene({ enterAt, exitAt, tag, lines, desc, img, accent, dark }: FeatureSceneProps) {
  const t = useTime();
  if (t < enterAt - 0.1 || t >= exitAt) return null;

  const enterP = eOut4(prog(t, enterAt, enterAt + 0.55));
  const imgP = eOutBack(prog(t, enterAt + 0.2, enterAt + 0.9));
  const exitP = eOut4(prog(t, exitAt - 0.45, exitAt));

  const bg = dark ? "#0D1117" : "#F5F0E8";
  const tc = dark ? "#FFFFFF" : "#1A1A1A";
  const sc = dark ? "rgba(255,255,255,0.5)" : "#6A6058";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        transform: exitP > 0 ? `translateX(${exitP * -70}px)` : "none",
        opacity: 1 - exitP * 0.7,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.035)"} 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Screenshot area */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: "37%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: accent,
            filter: "blur(72px)",
            opacity: 0.22 * imgP,
          }}
        />
        <img
          src={img}
          alt={tag}
          style={{
            height: "84%",
            width: "auto",
            borderRadius: 20,
            boxShadow: `0 28px 72px rgba(0,0,0,${dark ? 0.5 : 0.22})`,
            transform: `translateY(${lerp(220, 0, imgP)}px) rotate(${lerp(6, 0, imgP)}deg) scale(${lerp(0.88, 1, imgP)})`,
            position: "relative",
            zIndex: 2,
          }}
        />
      </div>

      {/* Text */}
      <div
        style={{
          padding: "0 40px 44px",
          zIndex: 3,
          paddingTop: 56,
          background: dark
            ? "linear-gradient(to top, rgba(13,17,23,1) 65%, transparent)"
            : "linear-gradient(to top, rgba(245,240,232,1) 65%, transparent)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: accent,
            borderRadius: 100,
            padding: "5px 15px",
            marginBottom: 14,
            opacity: enterP,
            transform: `translateX(${lerp(-28, 0, enterP)}px)`,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#FFFFFF",
            }}
          >
            {tag}
          </span>
        </div>

        {lines.map((line, i) => (
          <div key={i} style={{ overflow: "hidden" }}>
            <h2
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 52,
                fontWeight: 900,
                color: tc,
                letterSpacing: "-2.5px",
                lineHeight: 1.0,
                transform: `translateY(${lerp(80, 0, eOut4(prog(t, enterAt + i * 0.12, enterAt + 0.6 + i * 0.12)))}px)`,
                display: "block",
              }}
            >
              {line}
            </h2>
          </div>
        ))}

        <div style={{ marginTop: 12, minHeight: 20 }}>
          <Typed
            text={desc}
            t={t}
            startAt={enterAt + 0.65}
            speed={24}
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              color: sc,
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── SCENE 6: Countdown 19.4–23.2s ────────────────────────────────────────────
function Scene06() {
  const t = useTime();
  if (t < 19.2 || t >= 23.2) return null;

  const enterP = eOut4(prog(t, 19.5, 20.8));
  const exitP = eOut4(prog(t, 22.6, 23.2));

  const launch = new Date("2026-05-04T00:00:00+01:00").getTime();
  const diff = Math.max(0, launch - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const units = [
    { val: String(days).padStart(2, "0"), label: "Days" },
    { val: String(hours).padStart(2, "0"), label: "Hrs" },
    { val: String(mins).padStart(2, "0"), label: "Mins" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "linear-gradient(160deg, #5C1010 0%, #2A0606 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: 1 - exitP,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.018) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: 52,
          opacity: enterP,
          zIndex: 1,
        }}
      >
        Launching in
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", zIndex: 1 }}>
        {units.map(({ val, label }, i) => {
          const p = eOutElastic(prog(t, 19.5 + i * 0.18, 20.9 + i * 0.18));
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <span
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 64,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.12)",
                    lineHeight: 1,
                    marginTop: 10,
                    opacity: p,
                  }}
                >
                  :
                </span>
              )}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 86,
                    fontWeight: 900,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    letterSpacing: "-4px",
                    transform: `translateY(${lerp(80, 0, p)}px) scale(${lerp(0.6, 1, p)})`,
                    opacity: p,
                  }}
                >
                  {val}
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.28)",
                    marginTop: 10,
                    opacity: eOut(prog(t, 20.5 + i * 0.1, 21.2)),
                  }}
                >
                  {label}
                </p>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 52,
          textAlign: "center",
          zIndex: 1,
          opacity: eOut(prog(t, 21.3, 22.1)),
          transform: `translateY(${lerp(18, 0, eOut(prog(t, 21.3, 22.1)))}px)`,
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "-0.5px",
          }}
        >
          Monday, May 4th 2026
        </p>
      </div>
    </div>
  );
}

// ── SCENE 7: End Card 23–25s ──────────────────────────────────────────────────
function Scene07() {
  const t = useTime();
  if (t < 23.0) return null;

  const logoP = eOutElastic(prog(t, 23.2, 24.5));
  const textP = eOut(prog(t, 23.7, 24.6));
  const pillP = eOutBack(prog(t, 24.1, 24.9));
  const lineP = eOut4(prog(t, 23.0, 23.6));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#EDEAE3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.045) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "#7D1A1A",
          transform: `scaleX(${lineP})`,
          transformOrigin: "left",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "#7D1A1A",
          transform: `scaleX(${lineP})`,
          transformOrigin: "right",
        }}
      />

      <div
        style={{
          transform: `scale(${lerp(0.4, 1, logoP)}) rotate(${lerp(12, 0, logoP)}deg)`,
          opacity: Math.min(1, logoP),
          marginBottom: 28,
          zIndex: 1,
          filter: "drop-shadow(0 20px 40px rgba(125,26,26,0.2))",
        }}
      >
        <img src={LOGO_CROP} alt="Vestis" style={{ height: 96, width: "auto" }} />
      </div>

      <div
        style={{
          zIndex: 1,
          textAlign: "center",
          marginBottom: 10,
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typed
          text="Download May 4th."
          t={t}
          startAt={23.8}
          speed={20}
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 30,
            fontWeight: 900,
            color: "#1A1A1A",
            letterSpacing: "-1px",
          }}
        />
      </div>

      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 14,
          color: "#9A9080",
          opacity: textP,
          zIndex: 1,
          marginBottom: 44,
          transform: `translateY(${lerp(14, 0, textP)}px)`,
        }}
      >
        Free on iOS · App Store
      </p>

      <div
        style={{
          background: "#7D1A1A",
          borderRadius: 100,
          padding: "13px 32px",
          zIndex: 1,
          transform: `scale(${lerp(0.65, 1, pillP)})`,
          opacity: pillP,
          boxShadow: "0 10px 28px rgba(125,26,26,0.35)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          @VESTISAPP
        </p>
      </div>
    </div>
  );
}

// ── Keyframes injected once ───────────────────────────────────────────────────
const styleTag =
  typeof document !== "undefined" &&
  (() => {
    const id = "vestis-launch-video-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes cursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    `;
    document.head.appendChild(el);
  })();
void styleTag;

// ── Main export ───────────────────────────────────────────────────────────────
export function VestisLaunchVideo() {
  return (
    <div
      style={{
        background: "#0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <Stage>
        <Scene01 />
        <Scene02 />
        <FeatureScene
          enterAt={7.5}
          exitAt={11.6}
          tag="AI Outfit Generator"
          lines={["Get dressed", "in seconds."]}
          desc="Tell it your occasion. Full outfit instantly."
          img={IMG_OUTFIT}
          accent="#7D1A1A"
          dark={false}
        />
        <FeatureScene
          enterAt={11.6}
          exitAt={15.6}
          tag="Outfit Calendar"
          lines={["Plan every", "look."]}
          desc="Schedule outfits ahead. Track what you've worn."
          img={IMG_CALENDAR}
          accent="#1A1A7A"
          dark={true}
        />
        <FeatureScene
          enterAt={15.6}
          exitAt={19.4}
          tag="Digital Wardrobe"
          lines={["Own your", "style."]}
          desc="Every piece catalogued. Wardrobe value tracked."
          img={IMG_WARDROBE}
          accent="#8B6B3D"
          dark={false}
        />
        <Scene06 />
        <Scene07 />
        {/* Transitions */}
        <SlideWipe at={3.0} color="#7D1A1A" />
        <SlideWipe at={7.4} color="#F5F0E8" />
        <SlideWipe at={11.5} color="#0D1117" />
        <SlideWipe at={15.5} color="#F5F0E8" />
        <SlideWipe at={19.3} color="#2A0606" />
        <SlideWipe at={23.0} color="#EDEAE3" />
        <FlashCut at={3.0} />
        <FlashCut at={7.4} />
        <FlashCut at={11.5} />
        <FlashCut at={15.5} />
        <FlashCut at={19.3} />
        <FlashCut at={23.0} />
      </Stage>
    </div>
  );
}

export default VestisLaunchVideo;
