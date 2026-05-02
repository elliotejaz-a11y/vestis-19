import { forwardRef } from "react";
import { ClothingItem } from "@/types/wardrobe";
import logo from "@/assets/vestis-logo.png";

interface Props {
  items: ClothingItem[];
  username?: string | null;
  occasion?: string;
  /** Optional override (eg. "vestisapp.online"). Defaults to "vestisapp.online". */
  tagline?: string;
}

const CATEGORY_ORDER = ["hats", "accessories", "outerwear", "jumpers", "tops", "dresses", "bottoms", "shoes"];

// Layout as % of canvas: cx/cy = center, w/h = size (% of canvas), z = stack order
const BASE_LAYOUT: Record<string, { cx: number; cy: number; w: number; h: number; z: number }> = {
  hats:        { cx: 50, cy: 8,  w: 28, h: 18, z: 50 },
  accessories: { cx: 50, cy: 22, w: 22, h: 14, z: 45 },
  outerwear:   { cx: 50, cy: 38, w: 70, h: 36, z: 30 },
  jumpers:     { cx: 50, cy: 38, w: 60, h: 34, z: 31 },
  tops:        { cx: 50, cy: 38, w: 52, h: 32, z: 35 },
  dresses:     { cx: 50, cy: 50, w: 56, h: 60, z: 26 },
  bottoms:     { cx: 50, cy: 70, w: 54, h: 40, z: 24 },
  shoes:       { cx: 50, cy: 93, w: 36, h: 14, z: 25 },
};

const SPREAD_X = [0, -14, 14, -26, 26];

/**
 * Branded portrait share card. Designed to be rendered off-screen and captured
 * with html-to-image. Fixed pixel dimensions (1080x1350 ~ Instagram portrait).
 */
export const ShareOutfitCard = forwardRef<HTMLDivElement, Props>(
  ({ items, username, occasion, tagline = "vestisapp.online" }, ref) => {
    const sorted = [...items].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf((a.category || "").toLowerCase());
      const bi = CATEGORY_ORDER.indexOf((b.category || "").toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const counts: Record<string, number> = {};

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          backgroundColor: "#F5F0EB",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif",
          color: "#2A1418",
          position: "relative",
          overflow: "hidden",
          padding: "70px 50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Header — logo + username */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <img
            src={logo}
            alt="Vestis"
            crossOrigin="anonymous"
            style={{ height: 80, width: "auto", objectFit: "contain" }}
          />
          {username && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: "#8B1A2F",
                letterSpacing: "0.02em",
              }}
            >
              @{username}
            </div>
          )}
        </div>

        {/* Outfit canvas — large, fills available space */}
        <div
          style={{
            position: "relative",
            width: 980,
            height: 980,
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          {sorted.map((item, idx) => {
            const cat = (item.category || "").toLowerCase();
            const base =
              BASE_LAYOUT[cat] ||
              { cx: 50, cy: 30 + (idx % 4) * 18, w: 40, h: 28, z: 10 };
            const ci = counts[cat] || 0;
            counts[cat] = ci + 1;
            const offsetX = ci > 0 ? SPREAD_X[ci % SPREAD_X.length] : 0;
            const offsetY = ci > 0 ? 3 : 0;
            const scale = ci > 0 ? 0.88 : 1;
            const widthPx = (base.w / 100) * 980 * scale;
            const heightPx = (base.h / 100) * 980 * scale;
            return (
              <img
                key={item.id}
                src={item.imageUrl}
                alt={item.name}
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  left: `${base.cx + offsetX}%`,
                  top: `${base.cy + offsetY}%`,
                  width: widthPx,
                  height: heightPx,
                  objectFit: "contain",
                  transform: "translate(-50%, -50%)",
                  zIndex: base.z + ci,
                  filter: "drop-shadow(0 6px 16px rgba(43, 20, 24, 0.14))",
                }}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {occasion && (
            <div style={{ fontSize: 22, fontWeight: 500, color: "#2A1418", opacity: 0.7 }}>
              {occasion}
            </div>
          )}
          <div
            style={{
              width: 60,
              height: 2,
              backgroundColor: "#8B1A2F",
              opacity: 0.6,
              marginBottom: 4,
            }}
          />
          <div style={{ fontSize: 20, color: "#8B1A2F", letterSpacing: "0.18em", fontWeight: 600 }}>
            {tagline.toUpperCase()}
          </div>
        </div>
      </div>
    );
  }
);

ShareOutfitCard.displayName = "ShareOutfitCard";
