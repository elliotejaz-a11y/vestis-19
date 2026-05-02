import { forwardRef } from "react";
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

/**
 * Branded portrait share card (1080x1350). Uses a responsive grid so every
 * item is visible and fills the canvas regardless of how many pieces are in
 * the outfit. Designed to be rendered off-screen and captured with html-to-image.
 */
export const ShareOutfitCard = forwardRef<HTMLDivElement, Props>(
  ({ items, username, occasion, tagline = "vestisapp.online" }, ref) => {
    const sorted = [...items].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf((a.category || "").toLowerCase());
      const bi = CATEGORY_ORDER.indexOf((b.category || "").toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const n = sorted.length;
    // Pick column count so the grid fills the canvas comfortably.
    const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.max(1, Math.ceil(n / cols));

    const CANVAS = 980;
    const GAP = 18;
    const cellW = (CANVAS - GAP * (cols - 1)) / cols;
    const cellH = (CANVAS - GAP * (rows - 1)) / rows;

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

        {/* Outfit grid — every item visible, fills the canvas */}
        <div
          style={{
            position: "relative",
            width: CANVAS,
            height: CANVAS,
            marginTop: 18,
            marginBottom: 10,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
            gridAutoRows: `${cellH}px`,
            gap: GAP,
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          {sorted.map((item) => (
            <div
              key={item.id}
              style={{
                width: cellW,
                height: cellH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.55)",
                borderRadius: 22,
                padding: 16,
                boxSizing: "border-box",
                boxShadow: "0 6px 18px rgba(43,20,24,0.08)",
              }}
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                crossOrigin="anonymous"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 12px rgba(43,20,24,0.12))",
                }}
              />
            </div>
          ))}
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
