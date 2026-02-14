import { useState } from "react";
import { ClothingItem, Outfit, CATEGORIES } from "@/types/wardrobe";
import { User, Shirt, Palette, TrendingUp, LogOut, Pencil, DollarSign, MessageSquare, Bookmark, AtSign, Trash2, RotateCcw, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OutfitCard } from "@/components/OutfitCard";
import Onboarding from "@/pages/Onboarding";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";

interface DeletedItem extends ClothingItem {
  deletedAt: string;
}

interface Props {
  items: ClothingItem[];
  outfits?: Outfit[];
  onSaveOutfit?: (id: string, saved: boolean) => void;
  onDeleteOutfit?: (id: string) => void;
  deletedItems?: DeletedItem[];
  onRestoreItem?: (item: ClothingItem) => void;
  onPermanentDelete?: (id: string) => void;
}

export function Profile({ items, outfits = [], onSaveOutfit, onDeleteOutfit, deletedItems = [], onRestoreItem, onPermanentDelete }: Props) {
  const { user, profile, signOut, refreshProfile, updateProfile } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const savedOutfits = outfits.filter((o) => o.saved);

  const categoryBreakdown = CATEGORIES.map((cat) => ({
    ...cat,
    count: items.filter((i) => i.category === cat.value).length,
  }));

  const topColors = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.color] = (acc[i.color] || 0) + 1;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a).slice(0, 5);

  const totalWardrobeValue = items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
  const currency = profile?.currency_preference || "NZD";
  const currencySymbol = currency === "EUR" ? "€" : "$";

  const displayNameForTitle = profile?.display_name
    ? `${profile.display_name}'s Profile`
    : "My Profile";

  if (editingProfile) {
    return (
      <Onboarding editMode onComplete={async () => { await refreshProfile(); setEditingProfile(false); }} />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {displayNameForTitle}
            </h1>
            {profile?.username && (
              <p className="text-xs text-accent font-medium flex items-center justify-center gap-0.5">
                <AtSign className="w-3 h-3" />{profile.username}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowEditSheet(true)}>
            <Pencil className="w-4 h-4 text-accent" />
          </Button>
        </div>
        {profile?.bio && (
          <p className="text-xs text-foreground mt-3 leading-relaxed">{profile.bio}</p>
        )}
      </header>

      <div className="px-5 space-y-4">
        {/* Wardrobe Value */}
        <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Wardrobe Value</p>
            <p className="text-2xl font-bold text-foreground">{currencySymbol}{totalWardrobeValue.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">{currency}</span></p>
          </div>
          <DollarSign className="w-8 h-8 text-accent" />
        </div>

        {/* Style preferences */}
        {profile && (
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Style Preferences</p>
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} className="h-8 px-2.5 text-xs text-accent">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {profile.skin_tone && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Skin Tone</p>
                  <p className="font-medium text-foreground capitalize">{profile.skin_tone.replace(/-/g, " ")}</p>
                </div>
              )}
              {profile.style_preference && (
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-muted-foreground">Style</p>
                  <p className="font-medium text-foreground capitalize">{profile.style_preference.replace(/,/g, ", ")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saved Outfits */}
        {savedOutfits.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Saved Outfits</p>
            </div>
            <div className="space-y-3">
              {savedOutfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} onSave={onSaveOutfit} onDelete={onDeleteOutfit} />
              ))}
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
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: items.length ? `${(cat.count / items.length) * 100}%` : "0%" }} />
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

        {/* Recently Deleted */}
        {deletedItems.length > 0 && (
          <div id="recently-deleted-section" className="rounded-2xl bg-card border border-border/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Recently Deleted</p>
              <span className="text-[10px] text-muted-foreground ml-auto">Auto-deletes after 30 days</span>
            </div>
            <div className="space-y-2">
              {deletedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.category}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        onRestoreItem?.(item);
                        toast({ title: "Item restored ✨" });
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-accent" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Deleted button - always visible */}
        <Button
          variant="outline"
          onClick={() => {
            const el = document.getElementById("recently-deleted-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="w-full h-12 rounded-2xl text-sm"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Recently Deleted ({deletedItems.length})
        </Button>

        <Button variant="outline" onClick={() => navigate("/calendar")} className="w-full h-12 rounded-2xl text-sm">
          <CalendarDays className="w-4 h-4 mr-2" /> Outfit Calendar
        </Button>

        <Button variant="outline" onClick={() => navigate("/feedback")} className="w-full h-12 rounded-2xl text-sm">
          <MessageSquare className="w-4 h-4 mr-2" /> Help & Feedback
        </Button>

        <Button variant="outline" onClick={signOut} className="w-full h-12 rounded-2xl text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      <EditProfileSheet open={showEditSheet} onOpenChange={setShowEditSheet} />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={() => {
          if (deleteId) {
            onPermanentDelete?.(deleteId);
            setDeleteId(null);
            toast({ title: "Permanently deleted" });
          }
        }}
        title="Delete permanently?"
        description="This item will be permanently removed and cannot be recovered."
      />
    </div>
  );
}

export default Profile;
