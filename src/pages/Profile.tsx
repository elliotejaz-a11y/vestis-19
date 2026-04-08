import { useState, useEffect, useRef, useCallback } from "react";
import { ClothingItem, Outfit, CATEGORIES } from "@/types/wardrobe";
import { User, Shirt, Palette, TrendingUp, LogOut, Pencil, DollarSign, MessageSquare, Bookmark, AtSign, Trash2, RotateCcw, CalendarDays, Home, Sparkles, Users, Camera, Sun, Moon, Lock, Plus, Globe, X, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [fullscreenAvatar, setFullscreenAvatar] = useState(false);
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [wishlistPhoto, setWishlistPhoto] = useState("");
  const [wishlistName, setWishlistName] = useState("");
  const [wishlistPrice, setWishlistPrice] = useState("");
  const [wishlistSaving, setWishlistSaving] = useState(false);
  const wishlistFileRef = useRef<HTMLInputElement>(null);
  const [followSheet, setFollowSheet] = useState<{ open: boolean; type: "followers" | "following" }>({ open: false, type: "followers" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <button
            onClick={() => profile?.avatar_url && setFullscreenAvatar(true)}
            className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" style={{ objectPosition: profile.avatar_position || 'center' }} />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </button>
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
                    onClick={async () => {
                      await supabase.from("wishlist_items").delete().eq("id", wItem.id);
                      setWishlistItems(prev => prev.filter(w => w.id !== wItem.id));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/60 text-background flex items-center justify-center z-10"
                  >
                    <X className="w-3 h-3" />
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
                  onClick={() => wishlistItems.length < 3 && setShowAddWishlist(true)}
                  className="rounded-xl border-2 border-dashed border-border aspect-square flex items-center justify-center hover:border-accent/40 transition-colors"
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

      {/* Fullscreen Avatar Modal */}
      {fullscreenAvatar && profile?.avatar_url && (
        <div
          className="fixed inset-0 z-[10002] bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenAvatar(false)}
        >
          <button
            onClick={() => setFullscreenAvatar(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={profile.avatar_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Add Wishlist Item Sheet */}
      <Sheet open={showAddWishlist} onOpenChange={(o) => {
        setShowAddWishlist(o);
        if (!o) { setWishlistPhoto(""); setWishlistName(""); setWishlistPrice(""); }
      }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
          <SheetHeader>
            <SheetTitle className="text-lg font-bold tracking-tight">Add Wish List Item</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!wishlistPhoto ? (
              <button
                onClick={() => wishlistFileRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Upload Photo</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                <img src={wishlistPhoto} alt="Preview" className="w-full h-32 object-contain bg-white dark:bg-neutral-800" />
                <button
                  onClick={() => setWishlistPhoto("")}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/60 text-background flex items-center justify-center text-xs"
                >✕</button>
              </div>
            )}
            <input
              ref={wishlistFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !user) return;
                try {
                  const ext = file.name.split(".").pop() || "jpg";
                  const path = `${user.id}/wishlist_${crypto.randomUUID()}.${ext}`;
                  const { error } = await supabase.storage.from("clothing-images").upload(path, file, { contentType: file.type });
                  if (error) throw error;
                  const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
                  setWishlistPhoto(urlData.publicUrl);
                } catch {
                  toast({ title: "Upload failed", variant: "destructive" });
                }
              }}
            />
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Item Name</Label>
              <Input value={wishlistName} onChange={(e) => setWishlistName(e.target.value)} placeholder="e.g. Nike Air Max 90" className="mt-1 rounded-xl bg-card" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Price</Label>
              <Input type="number" inputMode="numeric" value={wishlistPrice} onChange={(e) => setWishlistPrice(e.target.value)} placeholder="e.g. 120" className="mt-1 rounded-xl bg-card" />
            </div>
            <Button
              onClick={async () => {
                if (!user || !wishlistName.trim()) {
                  toast({ title: "Please enter an item name", variant: "destructive" });
                  return;
                }
                setWishlistSaving(true);
                try {
                  const { error } = await supabase.from("wishlist_items").insert({
                    user_id: user.id,
                    name: wishlistName.trim(),
                    image_url: wishlistPhoto || "",
                    estimated_price: wishlistPrice ? parseFloat(wishlistPrice) : null,
                  } as any);
                  if (error) throw error;
                  toast({ title: "Added to wish list ✨" });
                  setShowAddWishlist(false);
                  setWishlistPhoto("");
                  setWishlistName("");
                  setWishlistPrice("");
                  fetchWishlist();
                } catch (err: any) {
                  toast({ title: "Failed to add item", description: err?.message || "Please try again.", variant: "destructive" });
                } finally {
                  setWishlistSaving(false);
                }
              }}
              disabled={!wishlistName.trim() || wishlistSaving}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
            >
              {wishlistSaving ? "Saving..." : <><Plus className="w-4 h-4 mr-2" /> Add to Wish List</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default Profile;
