import { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  hasStories: boolean;
  onTap: () => void;
  onAdd: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps an avatar with an Instagram-style gradient ring when the user has
 * active stories. Tap the avatar to view/add stories; tap the + badge to
 * go straight to the story creator.
 */
export function StoryRing({ hasStories, onTap, onAdd, className, children }: Props) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Gradient ring (shown only when stories exist) */}
      {hasStories && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -3,
            background: "conic-gradient(from 0deg, #f472b6, #a78bfa, #60a5fa, #34d399, #fbbf24, #f472b6)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
      )}

      {/* White gap between ring and avatar */}
      {hasStories && (
        <div
          className="absolute bg-background rounded-full"
          style={{ inset: -1, zIndex: 1 }}
        />
      )}

      {/* Avatar — the whole thing is the tap target */}
      <button
        onClick={onTap}
        className="relative rounded-full focus:outline-none active:opacity-80 transition-opacity"
        style={{ zIndex: 2 }}
        aria-label={hasStories ? "View your story" : "Add a story"}
      >
        {children}
      </button>

      {/* + badge — always visible, taps straight to story creator */}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="absolute rounded-full bg-accent border-2 border-background flex items-center justify-center shadow-sm active:opacity-75 transition-opacity"
        style={{
          width: 22,
          height: 22,
          bottom: -2,
          right: -2,
          zIndex: 10,
        }}
        aria-label="Add story"
      >
        <Plus className="text-accent-foreground" style={{ width: 12, height: 12, strokeWidth: 3 }} />
      </button>
    </div>
  );
}
