import { useState } from "react";
import { cn } from "@/lib/utils";

// Palette sourced from Vestis theme tokens (src/index.css):
// --accent hsl(350,55%,31%) deep rose  |  --secondary hsl(236,65%,34%) deep blue
// --gold hsl(38,60%,55%) warm amber    |  terracotta, sage, plum derived from same warm aesthetic
const INITIALS_COLOURS = [
  "hsl(350,55%,31%)",  // deep rose  (--accent)
  "hsl(236,65%,34%)",  // deep blue  (--secondary)
  "hsl(38,45%,40%)",   // warm amber (derived from --gold)
  "hsl(15,50%,35%)",   // terracotta
  "hsl(160,35%,30%)",  // sage green
  "hsl(280,35%,35%)",  // muted plum
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function getInitial(name?: string | null, email?: string | null): string {
  const n = name?.trim();
  if (n) return n[0].toUpperCase();
  const e = email?.trim();
  if (e) return e[0].toUpperCase();
  return "";
}

// Head circle + rounded shoulder path — scales cleanly from 24px to 200px via viewBox
function Silhouette({ bg, figure }: { bg: string; figure: string }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="100" height="100" fill={bg} />
      <circle cx="50" cy="38" r="17" fill={figure} />
      <path d="M16 86 Q16 64 50 64 Q84 64 84 86 Z" fill={figure} />
    </svg>
  );
}

const PRESET_CONFIGS: Record<string, { bg: string; figure: string }> = {
  silhouette_grey:  { bg: "#E8E4E0", figure: "#BFBAB5" },
  silhouette_rose:  { bg: "hsl(350,55%,31%)", figure: "rgba(255,255,255,0.85)" },
  silhouette_navy:  { bg: "hsl(236,65%,34%)", figure: "rgba(255,255,255,0.85)" },
  silhouette_amber: { bg: "hsl(38,45%,40%)",  figure: "rgba(255,255,255,0.85)" },
  silhouette_sage:  { bg: "hsl(160,35%,30%)", figure: "rgba(255,255,255,0.85)" },
};

export const AVATAR_PRESET_LIST = [
  { id: "silhouette_grey",  label: "Grey" },
  { id: "silhouette_rose",  label: "Rose" },
  { id: "silhouette_navy",  label: "Navy" },
  { id: "silhouette_amber", label: "Amber" },
  { id: "silhouette_sage",  label: "Sage" },
] as const;

export type AvatarPresetId = typeof AVATAR_PRESET_LIST[number]["id"];

export interface UserAvatarProps {
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  displayName?: string | null;
  email?: string | null;
  userId?: string | null;
  className?: string;
  avatarPosition?: string | null;
}

export function UserAvatar({
  avatarUrl,
  avatarPreset,
  displayName,
  email,
  userId,
  className,
  avatarPosition,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initial  = getInitial(displayName, email);
  const seed     = userId || displayName || email || "";
  const bg       = INITIALS_COLOURS[hashStr(seed) % INITIALS_COLOURS.length];

  const showPhoto    = !!avatarUrl && !imgError;
  const presetCfg    = !showPhoto && avatarPreset ? (PRESET_CONFIGS[avatarPreset] ?? null) : null;
  const showInitials = !showPhoto && !presetCfg && !!initial;

  return (
    <div
      className={cn("rounded-full overflow-hidden flex-shrink-0 bg-muted", className)}
      style={{ containerType: "inline-size" }}
    >
      {showPhoto ? (
        <img
          src={avatarUrl!}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: avatarPosition || "center" }}
          onError={() => setImgError(true)}
        />
      ) : presetCfg ? (
        <Silhouette bg={presetCfg.bg} figure={presetCfg.figure} />
      ) : showInitials ? (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold select-none"
          style={{ background: bg, fontSize: "42cqi" }}
        >
          {initial}
        </div>
      ) : (
        <Silhouette bg="#E8E4E0" figure="#BFBAB5" />
      )}
    </div>
  );
}
