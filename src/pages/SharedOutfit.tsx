import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShareOutfitCard } from "@/components/ShareOutfitCard";
import { ClothingItem } from "@/types/wardrobe";
import logo from "@/assets/vestis-logo.png";

interface SharedOutfitRow {
  id: string;
  username: string | null;
  display_name: string | null;
  outfit_name: string | null;
  occasion: string | null;
  items: Array<{ id: string; name: string; category: string; imageUrl: string }>;
  created_at: string;
}

/**
 * Public, standalone shared-outfit viewer. No app chrome, no nav, no auth.
 * Anyone with the link can view; nothing redirects into the main app.
 */
export default function SharedOutfit() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<SharedOutfitRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("shared_outfits")
        .select("id, username, display_name, outfit_name, occasion, items, created_at")
        .eq("id", shareId)
        .maybeSingle();

      if (error || !data) {
        setError("This shared outfit could not be found.");
      } else {
        setData(data as unknown as SharedOutfitRow);
      }
      setLoading(false);
    })();
  }, [shareId]);

  // Update document title for nicer link previews
  useEffect(() => {
    const username = data?.username || data?.display_name;
    document.title = username ? `@${username}'s outfit · Vestis` : "Shared outfit · Vestis";
    return () => { document.title = "Vestis"; };
  }, [data]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F0EB",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif",
        color: "#2A1418",
      }}
    >
      {loading && <p style={{ opacity: 0.6 }}>Loading outfit…</p>}

      {!loading && error && (
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <img src={logo} alt="Vestis" style={{ height: 56, margin: "0 auto 16px", display: "block" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Outfit not found</h1>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{error}</p>
        </div>
      )}

      {!loading && data && (
        <div style={{ width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {/* Scaled-down version of the share card so it fits any screen */}
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              aspectRatio: "1080 / 1350",
              overflow: "hidden",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(43, 20, 24, 0.12)",
              backgroundColor: "#F5F0EB",
              position: "relative",
            }}
          >
            <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 1080, height: 1350 }}>
              <ShareOutfitCard
                items={data.items as ClothingItem[]}
                username={data.username || data.display_name || undefined}
                occasion={data.occasion || undefined}
              />
            </div>
          </div>

          <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center" }}>
            Made with Vestis ·{" "}
            <a href="https://vestisapp.online" style={{ color: "#8B1A2F", textDecoration: "none", fontWeight: 600 }}>
              vestisapp.online
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
