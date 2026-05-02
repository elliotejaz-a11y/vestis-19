import { forwardRef, useMemo } from "react";
import { ClothingItem } from "@/types/wardrobe";
import logo from "@/assets/vestis-logo.png";

interface Props {
  items: ClothingItem[];
  username?: string | null;
  occasion?: string;
  tagline?: string;
}

const CATEGORY_ORDER = [
  "hats",
  "accessories",
  "outerwear",
  "jumpers",
  "tops",
  "dresses",
  "bottoms",
  "shoes",
];

type Layout = { x: number; y: number; w: number; h: number; z: number };

const BASE_LAYOUT: Record<string, Layout> = {
  hats: { x: 56, y: 16, w: 64, h: 64, z: 50 },
  accessories: { x: 78, y: 42, w: 58, h: 58, z: 45 },
  outerwear: { x: 36, y: 34, w: 130, h: 130, z: 30 },
  jumpers: { x: 36, y: 34, w: 130, h: 130, z: 29 },
  tops: { x: 52, y: 36, w: 112, h: 112, z: 35 },
  dresses: { x: 50, y: 52, w: 118, h: 146, z: 26 },
  bottoms: { x: 50, y: 70, w: 122, h: 148, z: 24 },
  shoes: { x: 72, y: 88, w: 80, h: 80, z: 25 },
};

const SPREAD = [-8, 0, 8, -14, 14];

/**
 * Branded portrait share card (1080x1350). Mirrors the flat-lay composition
 * used in the outfit generator so the receiver sees the outfit as-built.
 */
export const ShareOutfitCard = forwardRef<HTMLDivElement, Props>(
  ({ items, username, occasion, tagline = "vestisapp.online" }, ref) => {
    const CANVAS_SCALE = 3.35;
    const sorted = useMemo(
      () =>
        [...items].sort((a, b) => {
          const ai = CATEGORY_ORDER.indexOf((a.category || "").toLowerCase());
          const bi = CATEGORY_ORDER.indexOf((b.category || "").toLowerCase());
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }),
      [items],
    );

    const countByCategory: Record<string, number> = {};

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
          padding: "60px 50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <img
            src={logo}
            alt="Vestis"
            crossOrigin="anonymous"
            style={{ height: 70, width: "auto", objectFit: "contain" }}
          />
          {username && (
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: "#8B1A2F",
                letterSpacing: "0.02em",
              }}
            >
              @{username}
            </div>
          )}
        </div>

        {/* Outfit canvas — matches the generator composition */}
        <div
          style={{
            position: "relative",
            width: 980,
            height: 980,
            marginTop: 18,
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          {sorted.map((item, idx) => {
            const category = (item.category || "").toLowerCase();
            const base =
              BASE_LAYOUT[category] || { x: 20 + (idx % 4) * 18, y: 20 + Math.floor(idx / 4) * 22, w: 80, h: 80, z: 10 };
            const catIndex = countByCategory[category] || 0;
            countByCategory[category] = catIndex + 1;

            const spread = SPREAD[catIndex % SPREAD.length];
            const x = base.x + spread;
            const y = base.y + (catIndex > 0 ? 4 : 0);
            const scale = catIndex > 0 ? 0.9 : 1;

            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: base.w * scale * CANVAS_SCALE,
                  height: base.h * scale * CANVAS_SCALE,
                  zIndex: base.z + catIndex,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  crossOrigin="anonymous"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "drop-shadow(0 10px 20px rgba(43,20,24,0.14))",
                  }}
                />
              </div>
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
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "#2A1418",
                opacity: 0.7,
              }}
            >
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
          <div
            style={{
              fontSize: 20,
              color: "#8B1A2F",
              letterSpacing: "0.18em",
              fontWeight: 600,
            }}
          >
            {tagline.toUpperCase()}
          </div>
        </div>
      </div>
    );
  },
);

ShareOutfitCard.displayName = "ShareOutfitCard";
