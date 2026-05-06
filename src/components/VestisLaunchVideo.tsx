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
const IMG_UPLOAD = "/vestis-launch/mass-upload.png";

const DURATION = 20;
const W = 405;
const H = 720;

// ── Easing ────────────────────────────────────────────────────────────────────
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const prog = (t: number, s: number, e: number) => clamp01((t - s) / (e - s));
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
const eOut4 = (t: number) => 1 - Math.pow(1 - t, 4);
const eOut5 = (t: number) => 1 - Math.pow(1 - t, 5);
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

// ── Time context ──────────────────────────────────────────────────────────────
const TimeCtx = createContext(0);
const useTime = () => useContext(TimeCtx);

// ── Stage + scrubber ──────────────────────────────────────────────────────────
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
  const scale = Math.min(vw / W, (vh - 64) / H);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div
        style={{
          width: W * scale,
          height: H * scale,
          position: "relative",
          overflow: "hidden",
          borderRadius: 20 * scale,
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
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
            borderRadius: 20,
          }}
        >
          <TimeCtx.Provider value={time}>{children}</TimeCtx.Provider>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          width: W * scale,
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          onClick={seek}
          style={{
            height: 3,
            background: "rgba(255,255,255,0.1)",
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
              background: "linear-gradient(90deg,#7D1A1A,#4A8FCC)",
              borderRadius: 99,
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={togglePlay}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 99,
              color: "#fff",
              width: 30 * scale,
              height: 30 * scale,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 13 * scale,
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <span
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10 * scale,
              color: "rgba(255,255,255,0.3)",
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
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 99,
              color: "rgba(255,255,255,0.4)",
              padding: `${3 * scale}px ${9 * scale}px`,
              cursor: "pointer",
              fontSize: 9 * scale,
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

// ── Typed text ────────────────────────────────────────────────────────────────
function Typed({
  text,
  t,
  startAt,
  speed = 20,
  style = {},
}: {
  text: string;
  t: number;
  startAt: number;
  speed?: number;
  style?: CSSProperties;
}) {
  const chars = Math.floor(prog(t, startAt, startAt + text.length / speed) * text.length);
  const done = chars >= text.length;
  return (
    <span style={style}>
      {text.slice(0, chars)}
      {!done && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "0.8em",
            background: "currentColor",
            marginLeft: 2,
            verticalAlign: "middle",
            animation: "cursorBlink 0.65s steps(1) infinite",
          }}
        />
      )}
    </span>
  );
}

// ── iPhone frame ──────────────────────────────────────────────────────────────
function IPhone({
  img,
  width = 160,
  rotate = 0,
  rotateY = 0,
  translateX = 0,
  translateY = 0,
  opacity = 1,
  scale = 1,
}: {
  img: string;
  width?: number;
  rotate?: number;
  rotateY?: number;
  translateX?: number;
  translateY?: number;
  opacity?: number;
  scale?: number;
}) {
  const h = width * 2.16;
  const r = width * 0.13;
  return (
    <div
      style={{
        width,
        height: h,
        position: "absolute",
        transform: `translateX(${translateX}px) translateY(${translateY}px) rotateY(${rotateY}deg) rotate(${rotate}deg) scale(${scale})`,
        transformOrigin: "center center",
        opacity,
        perspective: 800,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(145deg, #2A2A2E 0%, #1A1A1E 50%, #0E0E12 100%)",
          borderRadius: r,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.12), 0 30px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Screen */}
        <div
          style={{
            position: "absolute",
            top: width * 0.04,
            left: width * 0.04,
            right: width * 0.04,
            bottom: width * 0.04,
            borderRadius: r * 0.75,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <img
            src={img}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              display: "block",
            }}
            alt="screen"
          />
          {/* Dynamic island */}
          <div
            style={{
              position: "absolute",
              top: width * 0.025,
              left: "50%",
              transform: "translateX(-50%)",
              width: width * 0.28,
              height: width * 0.055,
              background: "#000",
              borderRadius: 99,
              zIndex: 10,
            }}
          />
        </div>
        {/* Side button */}
        <div
          style={{
            position: "absolute",
            right: -width * 0.018,
            top: "28%",
            width: width * 0.018,
            height: "14%",
            background: "#333",
            borderRadius: "0 3px 3px 0",
          }}
        />
        {/* Volume buttons */}
        <div
          style={{
            position: "absolute",
            left: -width * 0.018,
            top: "20%",
            width: width * 0.018,
            height: "8%",
            background: "#333",
            borderRadius: "3px 0 0 3px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -width * 0.018,
            top: "31%",
            width: width * 0.018,
            height: "8%",
            background: "#333",
            borderRadius: "3px 0 0 3px",
          }}
        />
      </div>
    </div>
  );
}

// ── Flash cut ─────────────────────────────────────────────────────────────────
function FlashCut({ at, duration = 0.08 }: { at: number; duration?: number }) {
  const t = useTime();
  const p = prog(t, at, at + duration);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        zIndex: 100,
        background: "#FFFFFF",
        opacity: p < 0.5 ? p * 2 : (1 - p) * 2,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Slide wipe ────────────────────────────────────────────────────────────────
function SlideWipe({ at, color = "#0D1525" }: { at: number; color?: string }) {
  const t = useTime();
  const inP = eOut5(prog(t, at, at + 0.16));
  const outP = eOut5(prog(t, at + 0.16, at + 0.32));
  if (inP <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        zIndex: 99,
        background: color,
        transform:
          inP < 1
            ? `translateX(${lerp(-105, 0, inP)}%)`
            : `translateX(${lerp(0, 105, outP)}%)`,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Cold scanline overlay ─────────────────────────────────────────────────────
function ColdOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        zIndex: 10,
        pointerEvents: "none",
        background:
          "linear-gradient(to bottom, rgba(10,20,60,0.15) 0%, transparent 30%, transparent 70%, rgba(10,20,60,0.2) 100%)",
      }}
    />
  );
}

// ── Loading bar ───────────────────────────────────────────────────────────────
function LoadingBar({ t, startAt }: { t: number; startAt: number }) {
  const fillP = prog(t, startAt, startAt + 0.9);
  const labelP = eOut(prog(t, startAt, startAt + 0.3));
  return (
    <div style={{ zIndex: 1, marginTop: 20, width: 220, textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          opacity: labelP,
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 11,
            color: "rgba(74,143,204,0.7)",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Loading wardrobe
        </p>
        <p
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 11,
            color: "rgba(74,143,204,0.5)",
            fontWeight: 700,
          }}
        >
          {Math.round(fillP * 100)}%
        </p>
      </div>
      <div
        style={{
          width: "100%",
          height: 3,
          background: "rgba(74,143,204,0.15)",
          borderRadius: 99,
          overflow: "hidden",
          border: "1px solid rgba(74,143,204,0.2)",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 99,
            width: `${fillP * 100}%`,
            background: "linear-gradient(90deg, #4A8FCC, #7D1AEE)",
            boxShadow: "0 0 12px rgba(74,143,204,0.8)",
            transition: "width 0.05s linear",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          justifyContent: "center",
          marginTop: 10,
          opacity: labelP,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: fillP > i / 4 ? "#4A8FCC" : "rgba(74,143,204,0.2)",
              transition: "background 0.2s",
              boxShadow: fillP > i / 4 ? "0 0 6px #4A8FCC" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── SCENE 1: Logo Reveal 0–2.9s ──────────────────────────────────────────────
function Scene01() {
  const t = useTime();
  if (t >= 2.9) return null;

  const logoP = eOutElastic(prog(t, 0.1, 1.1));
  const lineP = eOut5(prog(t, 0.0, 0.4));
  const tagP = eOut(prog(t, 0.8, 1.5));
  const exitP = eOut4(prog(t, 2.3, 2.9));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#12192E",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: 1 - exitP,
        transform: exitP > 0 ? `scale(${1 + exitP * 0.05})` : "none",
      }}
    >
      {/* Cold grid */}
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "linear-gradient(rgba(74,143,204,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(74,143,204,0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Corner accents */}
      {([
        { top: 0, left: 0, borderTop: "2px solid #4A8FCC", borderLeft: "2px solid #4A8FCC" },
        { top: 0, right: 0, borderTop: "2px solid #4A8FCC", borderRight: "2px solid #4A8FCC" },
        { bottom: 0, left: 0, borderBottom: "2px solid #4A8FCC", borderLeft: "2px solid #4A8FCC" },
        { bottom: 0, right: 0, borderBottom: "2px solid #4A8FCC", borderRight: "2px solid #4A8FCC" },
      ] as const).map((s, i) => (
        <div
          key={i}
          style={{ position: "absolute", width: 40, height: 40, ...s, opacity: lineP * 0.6 }}
        />
      ))}
      {/* Line sweeps */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #4A8FCC, #7D1A1A)",
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
          height: 2,
          background: "linear-gradient(90deg, #7D1A1A, #4A8FCC)",
          transform: `scaleX(${lineP})`,
          transformOrigin: "right",
        }}
      />
      {/* Logo */}
      <div
        style={{
          transform: `scale(${lerp(0.3, 1, logoP)})`,
          opacity: Math.min(1, logoP * 1.5),
          marginBottom: 24,
          zIndex: 1,
          filter: "brightness(0) invert(1) drop-shadow(0 0 48px rgba(255,255,255,0.6))",
        }}
      >
        <img src={LOGO_CROP} alt="Vestis" style={{ height: 88, width: "auto" }} />
      </div>
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "5px",
          textTransform: "uppercase",
          color: "#4A8FCC",
          textAlign: "center",
          opacity: tagP,
          transform: `translateY(${lerp(14, 0, tagP)}px)`,
          zIndex: 1,
        }}
      >
        Your wardrobe. Reimagined.
      </p>
    </div>
  );
}

// ── SCENE 2: Mass Upload + Extract Feature (2.6–6.4s) ────────────────────────
function Scene02() {
  const t = useTime();
  if (t < 2.6 || t >= 6.4) return null;

  const titleP = eOut4(prog(t, 2.8, 3.5));
  const phone1P = eOutBack(prog(t, 3.0, 3.8));
  const phone2P = eOutBack(prog(t, 3.3, 4.1));
  const card1P = eOut(prog(t, 3.5, 4.2));
  const card2P = eOut(prog(t, 3.8, 4.5));
  const pillsP = eOut(prog(t, 4.4, 5.0));
  const exitP = eOut4(prog(t, 5.8, 6.4));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#060C1A",
        display: "flex",
        flexDirection: "column",
        opacity: 1 - exitP,
        transform: exitP > 0 ? `translateY(${exitP * -40}px)` : "none",
      }}
    >
      <ColdOverlay />
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "linear-gradient(rgba(74,143,204,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,143,204,0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      {/* Glow orb */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(74,143,204,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Header */}
      <div style={{ padding: "52px 40px 0", zIndex: 2 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(74,143,204,0.12)",
            border: "1px solid rgba(74,143,204,0.2)",
            borderRadius: 100,
            padding: "5px 14px",
            marginBottom: 14,
            opacity: titleP,
            transform: `translateX(${lerp(-20, 0, titleP)}px)`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4A8FCC",
              animation: "cursorBlink 1s infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#4A8FCC",
            }}
          >
            AI-Powered Upload
          </span>
        </div>
        {(["Add your whole", "wardrobe in", "seconds."] as const).map((line, i) => (
          <div key={i} style={{ overflow: "hidden" }}>
            <h2
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-2.5px",
                color: i === 2 ? "#4A8FCC" : "#E8F0FF",
                transform: `translateY(${lerp(80, 0, eOut4(prog(t, 2.9 + i * 0.12, 3.6 + i * 0.12)))}px)`,
                display: "block",
              }}
            >
              {line}
            </h2>
          </div>
        ))}
      </div>

      {/* Two angled iPhones */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: 0,
          right: 0,
          bottom: 0,
          perspective: 900,
          perspectiveOrigin: "50% 50%",
        }}
      >
        {/* Phone 1 — Mass Upload */}
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: "5%",
            transform: `
              translateY(${lerp(200, 0, phone1P)}px)
              rotate(${lerp(25, -14, phone1P)}deg)
              rotateY(${lerp(0, 18, phone1P)}deg)
              scale(${lerp(0.7, 1, phone1P)})
            `,
            opacity: phone1P,
            zIndex: 3,
          }}
        >
          <IPhone img={IMG_UPLOAD} width={148} />
          <div
            style={{
              position: "absolute",
              bottom: -36,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(30,80,180,0.55)",
              border: "1px solid rgba(74,143,204,0.6)",
              borderRadius: 100,
              padding: "6px 16px",
              whiteSpace: "nowrap",
              opacity: card1P,
              boxShadow: "0 4px 20px rgba(74,143,204,0.3)",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              ⬆ Mass Upload
            </span>
          </div>
        </div>

        {/* Phone 2 — Extract Outfit */}
        <div
          style={{
            position: "absolute",
            right: "8%",
            top: "0%",
            transform: `
              translateY(${lerp(240, 0, phone2P)}px)
              rotate(${lerp(-20, 12, phone2P)}deg)
              rotateY(${lerp(0, -22, phone2P)}deg)
              scale(${lerp(0.7, 1, phone2P)})
            `,
            opacity: phone2P,
            zIndex: 2,
          }}
        >
          <IPhone img={IMG_OUTFIT} width={140} />
          <div
            style={{
              position: "absolute",
              bottom: -36,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(140,40,40,0.6)",
              border: "1px solid rgba(232,168,154,0.5)",
              borderRadius: 100,
              padding: "6px 16px",
              whiteSpace: "nowrap",
              opacity: card2P,
              boxShadow: "0 4px 20px rgba(125,26,26,0.4)",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.5px",
              }}
            >
              ✦ Extract Outfit
            </span>
          </div>
        </div>
      </div>

      {/* Feature pills */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 10,
          zIndex: 5,
          opacity: pillsP,
          transform: `translateY(${lerp(16, 0, pillsP)}px)`,
        }}
      >
        {["Snap a pile", "AI detects each item", "Zero manual tagging"].map((label) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 100,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature Scene ─────────────────────────────────────────────────────────────
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
  if (t < enterAt || t >= exitAt) return null;

  const enterP = eOut4(prog(t, enterAt, enterAt + 0.44));
  const imgP = eOutBack(prog(t, enterAt + 0.16, enterAt + 0.72));
  const exitP = eOut4(prog(t, exitAt - 0.36, exitAt));

  const bg = dark ? "#080E1C" : "#0D1525";
  const tc = "#E8F0FF";
  const sc = "rgba(200,220,255,0.45)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        transform: exitP > 0 ? `translateX(${exitP * -60}px)` : "none",
        opacity: 1 - exitP * 0.7,
      }}
    >
      <ColdOverlay />
      <div
        style={{
          position: "absolute",
          inset: 0 as unknown as string,
          backgroundImage:
            "linear-gradient(rgba(74,143,204,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(74,143,204,0.035) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* iPhone in upper half */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: "36%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 900,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            position: "absolute",
            background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)`,
            filter: "blur(40px)",
            opacity: imgP,
          }}
        />
        <div
          style={{
            transform: `
              translateY(${lerp(180, 0, imgP)}px)
              rotate(${lerp(-8, 0, imgP)}deg)
              rotateY(${lerp(-20, 4, imgP)}deg)
              scale(${lerp(0.8, 1, imgP)})
            `,
            opacity: imgP,
            position: "relative",
            zIndex: 2,
          }}
        >
          <IPhone img={img} width={168} />
        </div>
      </div>

      {/* Text */}
      <div
        style={{
          padding: "0 40px 44px",
          zIndex: 3,
          paddingTop: 52,
          background: `linear-gradient(to top, ${bg} 60%, transparent)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            borderRadius: 100,
            padding: "5px 14px",
            marginBottom: 14,
            opacity: enterP,
            transform: `translateX(${lerp(-24, 0, enterP)}px)`,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: accent,
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
                fontSize: 50,
                fontWeight: 900,
                color: tc,
                letterSpacing: "-2.5px",
                lineHeight: 1.0,
                transform: `translateY(${lerp(80, 0, eOut4(prog(t, enterAt + i * 0.1, enterAt + 0.48 + i * 0.1)))}px)`,
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
            startAt={enterAt + 0.52}
            speed={24}
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
              color: sc,
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── SCENE 6: Countdown 15.3–18.6s ────────────────────────────────────────────
function Scene06() {
  const t = useTime();
  if (t < 15.3 || t >= 18.6) return null;

  const enterP = eOut4(prog(t, 15.5, 16.6));
  const exitP = eOut4(prog(t, 18.1, 18.6));

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
        background: "linear-gradient(160deg, #0A0014 0%, #1A0030 50%, #000A20 100%)",
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
            "linear-gradient(rgba(120,60,200,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,60,200,0.06) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,60,200,0.12) 0%, transparent 65%)",
          opacity: enterP,
        }}
      />
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "5px",
          textTransform: "uppercase",
          color: "rgba(180,140,255,0.5)",
          marginBottom: 48,
          opacity: enterP,
          zIndex: 1,
        }}
      >
        Launching in
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", zIndex: 1 }}>
        {units.map(({ val, label }, i) => {
          const p = eOutElastic(prog(t, 15.5 + i * 0.14, 16.7 + i * 0.14));
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <span
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 68,
                    fontWeight: 900,
                    color: "rgba(180,140,255,0.15)",
                    lineHeight: 1,
                    marginTop: 8,
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
                    fontSize: 80,
                    fontWeight: 900,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    letterSpacing: "-4px",
                    transform: `translateY(${lerp(80, 0, p)}px) scale(${lerp(0.5, 1, p)})`,
                    opacity: p,
                    textShadow: "0 0 40px rgba(120,80,255,0.5)",
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
                    color: "rgba(180,140,255,0.35)",
                    marginTop: 10,
                    opacity: eOut(prog(t, 16.3 + i * 0.1, 17.0)),
                  }}
                >
                  {label}
                </p>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "rgba(200,180,255,0.5)",
          marginTop: 44,
          letterSpacing: "-0.3px",
          zIndex: 1,
          opacity: eOut(prog(t, 16.8, 17.5)),
          transform: `translateY(${lerp(16, 0, eOut(prog(t, 16.8, 17.5)))}px)`,
        }}
      >
        Monday, May 4th 2026
      </p>
    </div>
  );
}

// ── SCENE 7: End Card 18.3–20s ────────────────────────────────────────────────
function Scene07() {
  const t = useTime();
  if (t < 18.3) return null;

  const enterP = eOut5(prog(t, 18.4, 19.4));
  const logoP = eOutElastic(prog(t, 18.5, 19.6));
  const textP = eOut(prog(t, 19.0, 19.8));
  const qP = eOut(prog(t, 19.3, 20.0));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0 as unknown as string,
        background: "#070A10",
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
            "linear-gradient(rgba(74,143,204,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,143,204,0.04) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      {/* Horizontal glowing line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(74,143,204,0.4), rgba(125,26,26,0.4), transparent)",
          transform: `scaleX(${enterP})`,
          transformOrigin: "center",
          marginTop: -80,
        }}
      />
      {/* Corner brackets */}
      {([
        { top: 40, left: 40, borderTop: "2px solid #4A8FCC", borderLeft: "2px solid #4A8FCC" },
        { top: 40, right: 40, borderTop: "2px solid #4A8FCC", borderRight: "2px solid #4A8FCC" },
        { bottom: 40, left: 40, borderBottom: "2px solid #4A8FCC", borderLeft: "2px solid #4A8FCC" },
        { bottom: 40, right: 40, borderBottom: "2px solid #4A8FCC", borderRight: "2px solid #4A8FCC" },
      ] as const).map((s, i) => (
        <div
          key={i}
          style={{ position: "absolute", width: 32, height: 32, ...s, opacity: enterP * 0.7 }}
        />
      ))}
      {/* Logo */}
      <div
        style={{
          transform: `scale(${lerp(0.3, 1, logoP)})`,
          opacity: Math.min(1, logoP),
          marginBottom: 28,
          zIndex: 1,
          filter: "drop-shadow(0 0 32px rgba(74,143,204,0.5))",
        }}
      >
        <img
          src={LOGO_CROP}
          alt="Vestis"
          style={{ height: 80, width: "auto", filter: "brightness(0) invert(1)" }}
        />
      </div>
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "5px",
          textTransform: "uppercase",
          color: "rgba(74,143,204,0.7)",
          marginBottom: 20,
          opacity: textP,
          transform: `translateY(${lerp(12, 0, textP)}px)`,
          zIndex: 1,
        }}
      >
        MONDAY MAY 4TH, 2026
      </p>
      {/* Are you ready? */}
      <div style={{ zIndex: 1, textAlign: "center", marginBottom: 8 }}>
        <div style={{ overflow: "hidden" }}>
          <h2
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 42,
              fontWeight: 900,
              color: "#E8F0FF",
              letterSpacing: "-2px",
              lineHeight: 1.05,
              transform: `translateY(${lerp(80, 0, eOut4(prog(t, 18.9, 19.5)))}px)`,
            }}
          >
            Are you
          </h2>
        </div>
        <div style={{ overflow: "hidden" }}>
          <h2
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 42,
              fontWeight: 900,
              color: "#4A8FCC",
              letterSpacing: "-2px",
              lineHeight: 1.05,
              transform: `translateY(${lerp(80, 0, eOut4(prog(t, 19.1, 19.7)))}px)`,
            }}
          >
            ready?
          </h2>
        </div>
      </div>
      <LoadingBar t={t} startAt={19.3} />
      <p
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 11,
          color: "rgba(255,255,255,0.2)",
          marginTop: 48,
          zIndex: 1,
          opacity: qP,
          transform: `translateY(${lerp(12, 0, qP)}px)`,
          background: "rgba(74,143,204,0.12)",
          border: "1px solid rgba(74,143,204,0.3)",
          borderRadius: 100,
          padding: "10px 28px",
          boxShadow: "0 0 24px rgba(74,143,204,0.2)",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 17,
            fontWeight: 800,
            color: "#4A8FCC",
            letterSpacing: "0.5px",
          }}
        >
          @vestisapp
        </span>
      </p>
    </div>
  );
}

// ── Keyframes injected once ───────────────────────────────────────────────────
const _injectStyles =
  typeof document !== "undefined" &&
  (() => {
    const id = "vestis-launch-video-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes cursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(720px)} }
    `;
    document.head.appendChild(el);
  })();
void _injectStyles;

// ── Main export ───────────────────────────────────────────────────────────────
export function VestisLaunchVideo() {
  return (
    <div
      style={{
        background: "#050810",
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
          enterAt={6.2}
          exitAt={9.3}
          tag="AI Outfit Generator"
          lines={["Get dressed", "in seconds."]}
          desc="Your occasion. Full outfit. Instantly."
          img={IMG_OUTFIT}
          accent="#7D1A1A"
          dark={false}
        />
        <FeatureScene
          enterAt={9.3}
          exitAt={12.4}
          tag="Outfit Calendar"
          lines={["Plan every", "look."]}
          desc="Schedule ahead. Track what you've worn."
          img={IMG_CALENDAR}
          accent="#4A8FCC"
          dark={true}
        />
        <FeatureScene
          enterAt={12.4}
          exitAt={15.5}
          tag="Digital Wardrobe"
          lines={["Own your", "style."]}
          desc="Every piece catalogued. Value tracked."
          img={IMG_WARDROBE}
          accent="#8B6B3D"
          dark={false}
        />
        <Scene06 />
        <Scene07 />
        {/* Transitions */}
        <SlideWipe at={2.65} color="#060C1A" />
        <SlideWipe at={6.15} color="#080E1C" />
        <SlideWipe at={9.25} color="#080E1C" />
        <SlideWipe at={12.35} color="#080E1C" />
        <SlideWipe at={15.45} color="#0A0014" />
        <SlideWipe at={18.35} color="#070A10" />
        <FlashCut at={2.65} />
        <FlashCut at={6.15} />
        <FlashCut at={9.25} />
        <FlashCut at={12.35} />
        <FlashCut at={15.45} />
        <FlashCut at={18.35} />
      </Stage>
    </div>
  );
}

export default VestisLaunchVideo;
