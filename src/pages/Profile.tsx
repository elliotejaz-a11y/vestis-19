import { useState, useEffect, useRef, useCallback } from "react";
import { ClothingItem, Outfit, CATEGORIES } from "@/types/wardrobe";
import { User, Shirt, Palette, TrendingUp, LogOut, Pencil, DollarSign, MessageSquare, Bookmark, AtSign, Trash2, RotateCcw, CalendarDays, Home, Sparkles, Users, Camera, Sun, Moon, Lock, Plus, Globe, X } from "lucide-react";
import { convertPrice, formatPrice } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OutfitCard } from "@/components/OutfitCard";
import Onboarding from "@/pages/Onboarding";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { WardrobeServiceSheet } from "@/components/WardrobeServiceSheet";
import { FitPicSheet } from "@/components/FitPicSheet";
import { FitPicDetailSheet } from "@/components/FitPicDetailSheet";
import FollowListSheet from "@/components/FollowListSheet";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { ChangePasswordSheet } from "@/components/ChangePasswordSheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeletedItem extends ClothingItem {
  deletedAt: string;
}

interface Props {
  items: ClothingItem[];
  outfits?: Outfit[];
  onSaveOutfit?: (id: string, saved: boolean, name?: string, description?: string) => void;
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
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [fitPics, setFitPics] = useState<any[]>([]);
  const [selectedFitPic, setSelectedFitPic] = useState<any>(null);
  const [fullscreenFitPic, setFullscreenFitPic] = useState<any>(null);
  const [followSheet, setFollowSheet] = useState<{ open: boolean; type: "followers" | "following" }>({ open: false, type: "followers" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [showWishlistDialog, setShowWishlistDialog] = useState(false);
  const [wishlistName, setWishlistName] = useState("");
  const [wishlistPrice, setWishlistPrice] = useState("");
  const [wishlistImageFile, setWishlistImageFile] = useState<File | null>(null);
  const [savingWishlistItem, setSavingWishlistItem] = useState(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resetWishlistForm = () => {
    setWishlistName("");
    setWishlistPrice("");
    setWishlistImageFile(null);
  };

  const fetchFollowCounts = async () => {
    if (!user) return;
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchFollowCounts(), fetchFitPics(), refreshProfile(), fetchWishlist()])
      .finally(() => setRefreshing(false));
  }, [user]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current || refreshing) return;
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 80));
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (pullDistance > 50) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, handleRefresh]);

  const fetchFitPics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("fit_pics")
      .select("id, image_url, description, pic_date, is_private, created_at")
      .eq("user_id", user.id)
      .order("pic_date", { ascending: false });
    setFitPics(data || []);
  };

  const fetchWishlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(3);
    setWishlistItems(data || []);
  };

  const handleRemoveWishlistItem = async (wishlistItemId: string) => {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", wishlistItemId);

    if (error) {
      toast({ title: "Error", description: "Failed to remove wishlist item.", variant: "destructive" });
      return;
    }

    setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistItemId));
    toast({ title: "Removed from wishlist" });
  };

  const handleAddWishlistItem = async () => {
    if (!user) return;

    if (wishlistItems.length >= 3) {
      toast({ title: "Wishlist full", description: "You can save up to 3 wishlist items.", variant: "destructive" });
      return;
    }

    if (!wishlistName.trim()) {
      toast({ title: "Name required", description: "Enter a name for this wishlist item.", variant: "destructive" });
      return;
    }

    if (!wishlistImageFile) {
      toast({ title: "Photo required", description: "Choose a photo for this wishlist item.", variant: "destructive" });
      return;
    }

    setSavingWishlistItem(true);

    let imageUrl = "";

    const ext = wishlistImageFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/wishlist-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("clothing-images")
      .upload(path, wishlistImageFile, { contentType: wishlistImageFile.type });

    if (uploadError) {
      setSavingWishlistItem(false);
      toast({ title: "Upload failed", description: "Could not upload the wishlist photo.", variant: "destructive" });
      return;
    }

    imageUrl = supabase.storage.from("clothing-images").getPublicUrl(path).data.publicUrl;

    const priceValue = wishlistPrice.trim() ? Number(wishlistPrice) : null;
    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: user.id,
        name: wishlistName.trim(),
        image_url: imageUrl,
        estimated_price: Number.isNaN(priceValue) ? null : priceValue,
      } as any)
      .select("*")
      .single();

    setSavingWishlistItem(false);

    if (error || !data) {
      toast({ title: "Error", description: "Failed to save wishlist item.", variant: "destructive" });
      return;
    }

    setWishlistItems((prev) => [...prev, data].slice(0, 3));
    resetWishlistForm();
    setShowWishlistDialog(false);
    toast({ title: "Added to wishlist" });
  };

  useEffect(() => {
    if (!user) return;
    fetchFollowCounts();
    fetchFitPics();
    fetchWishlist();
  }, [user]);

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

  const totalWardrobeValueNzd = items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
  const currency = profile?.currency_preference || "NZD";
  const totalWardrobeValue = convertPrice(totalWardrobeValueNzd, currency);

  const displayNameForTitle = profile?.display_name
    ? `${profile.display_name}'s Profile`
    : "My Profile";

  if (editingProfile) {
    return (
      <Onboarding editMode onComplete={async () => { await refreshProfile(); setEditingProfile(false); }} />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-screen pb-24 overflow-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: refreshing ? 48 : pullDistance, opacity: refreshing || pullDistance > 10 ? 1 : 0 }}
      >
        <RotateCcw className={`w-5 h-5 text-accent ${refreshing ? "animate-spin" : ""}`} />
        <span className="text-xs text-muted-foreground ml-2">
          {refreshing ? "Refreshing…" : pullDistance > 50 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
      <header className="px-5 pt-12 pb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" style={{ objectPosition: profile.avatar_position || 'center' }} />
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
            <div className="flex items-center justify-center gap-4 mt-2">
              <button onClick={() => setFollowSheet({ open: true, type: "followers" })} className="text-center">
                <p className="text-sm font-bold text-foreground">{followerCount}</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </button>
              <div className="w-px h-6 bg-border" />
              <button onClick={() => setFollowSheet({ open: true, type: "following" })} className="text-center">
                <p className="text-sm font-bold text-foreground">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </button>
            </div>
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
            <p className="text-2xl font-bold text-foreground">{formatPrice(totalWardrobeValueNzd, currency)} <span className="text-sm font-normal text-muted-foreground">{currency}</span></p>
          </div>
          <DollarSign className="w-8 h-8 text-accent" />
        </div>

        {/* Fit Pics */}
        <div className="rounded-2xl bg-card border border-border/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Fit Pics</p>
            </div>
            <FitPicSheet onSaved={fetchFitPics}>
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-accent">
                <Camera className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </FitPicSheet>
          </div>
          {fitPics.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No fit pics yet — capture your looks!</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {fitPics.slice(0, 9).map((pic: any) => (
                <button
                  key={pic.id}
                  onClick={() => setFullscreenFitPic(pic)}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedFitPic(pic); }}
                  className="aspect-square rounded-xl overflow-hidden relative"
                >
                  <img src={pic.image_url} alt={pic.description || ""} className="w-full h-full object-cover" />
                  {pic.is_private && (
                    <div className="absolute top-1 right-1 bg-foreground/60 rounded-full px-1.5 py-0.5">
                      <span className="text-[8px] text-background">Private</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="rounded-2xl bg-card border border-border/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Wish List</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => {
              const wItem = wishlistItems[idx];
              return wItem ? (
                <div key={wItem.id} className="rounded-xl bg-muted p-2 text-center relative">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleRemoveWishlistItem(wItem.id);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/60 flex items-center justify-center z-10"
                  >
                    <X className="w-3 h-3 text-background" />
                  </button>
                  {wItem.image_url ? (
                    <div className="aspect-square rounded-lg overflow-hidden mb-1.5 bg-white dark:bg-neutral-800">
                      <img src={wItem.image_url} alt={wItem.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted-foreground/10 flex items-center justify-center mb-1.5">
                      <Shirt className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-[10px] font-medium text-foreground truncate">{wItem.name}</p>
                  {wItem.estimated_price != null && (
                    <p className="text-[10px] text-accent font-semibold">${wItem.estimated_price}</p>
                  )}
                </div>
              ) : (
                <button
                  key={`empty-${idx}`}
                  type="button"
                  onClick={() => setShowWishlistDialog(true)}
                  className="rounded-xl border-2 border-dashed border-border aspect-square flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-muted-foreground/40" />
                </button>
              );
            })}
          </div>
        </div>


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
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 flex-shrink-0">
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

        {/* Account Privacy */}
        <div className="rounded-2xl bg-card border border-border/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                {profile?.is_public ? <Globe className="w-4 h-4 text-accent" /> : <Lock className="w-4 h-4 text-accent" />}
                {profile?.is_public ? "Public Account" : "Private Account"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {profile?.is_public ? "Anyone can see your wardrobe & fit pics" : "Only you can see your wardrobe & fit pics"}
              </p>
            </div>
            <button
              onClick={() => updateProfile({ is_public: !profile?.is_public })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${profile?.is_public ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {profile?.is_public ? "Public" : "Private"}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl bg-card border border-border/40 p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Appearance</p>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                theme === "light" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                theme === "dark" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
          </div>
        </div>

        <WardrobeServiceSheet>
          <Button variant="outline" className="w-full h-12 rounded-2xl text-sm">
            <Home className="w-4 h-4 mr-2" /> Wardrobe Upload Service
          </Button>
        </WardrobeServiceSheet>

        <Button variant="outline" onClick={() => {
          if (user) localStorage.removeItem(`vestis_tutorial_seen_${user.id}`);
          window.dispatchEvent(new Event("vestis-replay-tutorial"));
        }} className="w-full h-12 rounded-2xl text-sm">
          <Sparkles className="w-4 h-4 mr-2" /> Replay App Tutorial
        </Button>

        <Button variant="outline" onClick={() => navigate("/feedback")} className="w-full h-12 rounded-2xl text-sm">
          <MessageSquare className="w-4 h-4 mr-2" /> Help & Feedback
        </Button>

        <Button variant="outline" onClick={() => setShowChangePassword(true)} className="w-full h-12 rounded-2xl text-sm">
          <Lock className="w-4 h-4 mr-2" /> Change Password
        </Button>

        <Button variant="outline" onClick={signOut} className="w-full h-12 rounded-2xl text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowDeleteAccount(true)}
          className="w-full h-12 rounded-2xl text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete Account
        </Button>

        {/* Policies */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 pb-4">
          {[
            { label: "Terms of Service", path: "/policies/terms" },
            { label: "Privacy Policy", path: "/policies/privacy" },
            { label: "Community Guidelines", path: "/policies/community" },
            { label: "Cookie Policy", path: "/policies/cookies" },
          ].map((p, i) => (
            <button
              key={i}
              onClick={() => navigate(p.path)}
              className="text-[10px] text-muted-foreground hover:text-accent transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <EditProfileSheet open={showEditSheet} onOpenChange={setShowEditSheet} />
      <ChangePasswordSheet open={showChangePassword} onOpenChange={setShowChangePassword} />

      <Dialog open={showWishlistDialog} onOpenChange={(open) => { setShowWishlistDialog(open); if (!open) resetWishlistForm(); }}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Add Wishlist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Photo</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1 rounded-xl bg-card"
                onChange={(e) => setWishlistImageFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input
                value={wishlistName}
                onChange={(e) => setWishlistName(e.target.value)}
                placeholder="Item name"
                className="mt-1 rounded-xl bg-card"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={wishlistPrice}
                onChange={(e) => setWishlistPrice(e.target.value)}
                placeholder="0.00"
                className="mt-1 rounded-xl bg-card"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleAddWishlistItem}
              disabled={savingWishlistItem}
              className="w-full rounded-xl bg-accent text-accent-foreground text-sm font-semibold"
            >
              {savingWishlistItem ? "Saving..." : "Add to Wishlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user && (
        <FollowListSheet
          open={followSheet.open}
          onOpenChange={(o) => {
            setFollowSheet((prev) => ({ ...prev, open: o }));
            if (!o) fetchFollowCounts();
          }}
          userId={user.id}
          type={followSheet.type}
        />
      )}

      <FitPicDetailSheet
        pic={selectedFitPic}
        open={!!selectedFitPic}
        onOpenChange={(o) => { if (!o) setSelectedFitPic(null); }}
        onUpdated={() => { setSelectedFitPic(null); fetchFitPics(); }}
      />

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

      <DeleteConfirmDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
        onConfirm={async () => {
          setDeletingAccount(true);
          try {
            const { error } = await supabase.functions.invoke("delete-account");
            if (error) throw error;
            toast({ title: "Account deleted", description: "Your account has been permanently removed." });
            await signOut();
          } catch (e: any) {
            toast({ title: "Error", description: "Failed to delete account. Please try again.", variant: "destructive" });
          } finally {
            setDeletingAccount(false);
            setShowDeleteAccount(false);
          }
        }}
        title="Delete your account?"
        description="This will permanently delete your account, wardrobe, outfits, and all associated data. This action cannot be undone."
      />

      {/* Fullscreen Fit Pic Modal */}
      {fullscreenFitPic && (
        <div
          className="fixed inset-0 z-[10002] bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenFitPic(null)}
        >
          <button
            onClick={() => setFullscreenFitPic(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={fullscreenFitPic.image_url}
            alt={fullscreenFitPic.description || ""}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default Profile;
