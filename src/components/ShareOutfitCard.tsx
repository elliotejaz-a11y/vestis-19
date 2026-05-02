import { forwardRef } from "react";
import { ClothingItem } from "@/types/wardrobe";
import logo from "@/assets/vestis-logo.png";

interface Props {
  items: ClothingItem[];
  username?: string | null;
  occasion?: string;
  /** Optional override (eg. "vestisapp.online"). Defaults to "vestis.app". */
  tagline?: string;
}

const CATEGORY_ORDER = ["hats", "accessories", "outerwear", "jumpers", "tops", "dresses", "bottoms", "shoes"];

const BASE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number; z: number }> = {
  hats: { x: 56, y: 14, w: 110, h: 110, z: 50 },
  accessories: { x: 78, y: 38, w: 96, h: 96, z: 45 },
  outerwear: { x: 36, y: 36, w: 220, h: 220, z: 30 },
  jumpers: { x: 36, y: 36, w: 220, h: 220, z: 29 },
  tops: { x: 52, y: 38, w: 190, h: 190, z: 35 },
  dresses: { x: 50, y: 52, w: 200, h: 250, z: 26 },
  bottoms: { x: 50, y: 70, w: 210, h: 250, z: 24 },
  shoes: { x: 72, y: 88, w: 130, h: 130, z: 25 },
};

const SPREAD = [-8, 0, 8, -14, 14];

/**
 * Branded portrait share card. Designed to be rendered off-screen and captured
 * with html-to-image. Fixed pixel dimensions (1080x1350 ~ Instagram portrait).
 */
export const ShareOutfitCard = forwardRef<HTMLDivElement, Props>(
  ({ items, username, occasion, tagline = "vestis.app" }, ref) => {
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
          padding: "80px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Header — logo + username */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <img
            src={logo}
            alt="Vestis"
            crossOrigin="anonymous"
            style={{ height: 90, width: "auto", objectFit: "contain" }}
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

        {/* Outfit canvas */}
        <div
          style={{
            position: "relative",
            width: 880,
            height: 880,
            marginTop: 30,
            marginBottom: 20,
          }}
        >
          {sorted.map((item, idx) => {
            const cat = (item.category || "").toLowerCase();
            const base =
              BASE_LAYOUT[cat] || { x: 30 + (idx % 4) * 16, y: 25 + Math.floor(idx / 4) * 22, w: 160, h: 160, z: 10 };
            const ci = counts[cat] || 0;
            counts[cat] = ci + 1;
            const spread = SPREAD[ci % SPREAD.length];
            const x = base.x + spread;
            const y = base.y + (ci > 0 ? 4 : 0);
            const scale = ci > 0 ? 0.9 : 1;
            return (
              <img
                key={item.id}
                src={item.imageUrl}
                alt={item.name}
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: base.w * scale,
                  height: base.h * scale,
                  objectFit: "contain",
                  transform: "translate(-50%, -50%)",
                  zIndex: base.z + ci,
                  filter: "drop-shadow(0 4px 12px rgba(43, 20, 24, 0.12))",
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
