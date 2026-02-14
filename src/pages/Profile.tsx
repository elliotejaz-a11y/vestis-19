import { useState } from "react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { User, Shirt, Palette, TrendingUp, LogOut, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Onboarding from "@/pages/Onboarding";

interface Props {
  items: ClothingItem[];
}

export function Profile({ items }: Props) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);

  const categoryBreakdown = CATEGORIES.map((cat) => ({
    ...cat,
    count: items.filter((i) => i.category === cat.value).length,
  }));

  const topColors = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.color] = (acc[i.color] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (editingProfile) {
    return (
      <Onboarding
        editMode
        onComplete={async () => {
          await refreshProfile();
          setEditingProfile(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {profile?.display_name || "My Style Profile"}
            </h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-4">
        {/* Style preferences */}
        {profile && (
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Style Preferences</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingProfile(true)}
                className="h-8 px-2.5 text-xs text-accent"
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {profile.skin_tone && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Skin Tone</p>
                  <p className="font-medium text-foreground capitalize">{profile.skin_tone}</p>
                </div>
              )}
              {profile.style_preference && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Style</p>
                  <p className="font-medium text-foreground capitalize">{profile.style_preference}</p>
                </div>
              )}
              {profile.body_type && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Body Type</p>
                  <p className="font-medium text-foreground capitalize">{profile.body_type}</p>
                </div>
              )}
              {profile.fashion_goals && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Goal</p>
                  <p className="font-medium text-foreground capitalize">{profile.fashion_goals.replace(/-/g, " ")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
            <Shirt className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold text-foreground">{items.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Pieces</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
            <Palette className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold text-foreground">{topColors.length}</p>
            <p className="text-[10px] text-muted-foreground">Colors</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/40 p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold text-foreground">{categoryBreakdown.filter((c) => c.count > 0).length}</p>
            <p className="text-[10px] text-muted-foreground">Categories</p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-2xl bg-card border border-border/40 p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Wardrobe Breakdown</p>
          <div className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.value} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{cat.icon} {cat.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: items.length ? `${(cat.count / items.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-4 text-right">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top colors */}
        {topColors.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Top Colors</p>
            <div className="flex gap-2">
              {topColors.map(([color, count]) => (
                <div key={color} className="flex-1 text-center">
                  <div className="text-xs font-medium text-foreground">{color}</div>
                  <div className="text-[10px] text-muted-foreground">{count} items</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <Button
          variant="outline"
          onClick={signOut}
          className="w-full h-12 rounded-2xl text-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default Profile;
