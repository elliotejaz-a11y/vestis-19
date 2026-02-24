import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocial } from "@/hooks/useSocial";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Lock, Loader2, AtSign, Shirt, Palette, TrendingUp, Camera, MoreVertical, Flag, Ban } from "lucide-react";
import { CATEGORIES } from "@/types/wardrobe";
import FollowListSheet from "@/components/FollowListSheet";
import UserWardrobeSheet from "@/components/UserWardrobeSheet";
import { ReportSheet } from "@/components/ReportSheet";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface UserProfileData {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  avatar_position: string;
  bio: string | null;
  is_public: boolean;
  style_preference: string | null;
}

interface FitPic {
  id: string;
  image_url: string;
  description: string;
  pic_date: string;
  created_at: string;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { followingIds, followUser, unfollowUser, blockUser } = useSocial();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followAction, setFollowAction] = useState<"none" | "loading">("none");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ label: string; icon: string; count: number }[]>([]);
  const [colorCount, setColorCount] = useState(0);
  const [fitPics, setFitPics] = useState<FitPic[]>([]);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [userColors, setUserColors] = useState<[string, number][]>([]);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isOwnProfile = userId === user?.id;
  const isFollowing = followingIds.includes(userId || "");
  const canView = isOwnProfile || profile?.is_public || isFollowing;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_position, bio, is_public, style_preference")
        .eq("id", userId)
        .single();
      setProfile(profileData as UserProfileData | null);

      // Counts
      const [{ count: fc }, { count: fgc }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      setFollowersCount(fc || 0);
      setFollowingCount(fgc || 0);

      // Wardrobe stats
      const { data: wardrobeData } = await supabase
        .from("clothing_items")
        .select("category, color")
        .eq("user_id", userId);

      if (wardrobeData) {
        setWardrobeCount(wardrobeData.length);
        const catCounts = CATEGORIES.map(cat => ({
          label: cat.label,
          icon: cat.icon,
          count: wardrobeData.filter(i => i.category === cat.value).length,
        }));
        setCategoryBreakdown(catCounts);
        const uniqueColors = new Set(wardrobeData.map(i => i.color).filter(Boolean));
        setColorCount(uniqueColors.size);
        // Build color breakdown
        const colorMap: Record<string, number> = {};
        wardrobeData.forEach(i => { if (i.color) colorMap[i.color] = (colorMap[i.color] || 0) + 1; });
        setUserColors(Object.entries(colorMap).sort(([,a],[,b]) => b - a));
      }

      // Fit pics (non-private for other users)
      const { data: pics } = await supabase
        .from("fit_pics")
        .select("id, image_url, description, pic_date, created_at")
        .eq("user_id", userId)
        .order("pic_date", { ascending: false });
      setFitPics((pics || []) as FitPic[]);

      // Check block status
      if (!isOwnProfile && user) {
        const { data: blockData } = await supabase
          .from("blocked_users")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", userId)
          .maybeSingle();
        setIsBlocked(!!blockData);
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  const handleFollow = async () => {
    if (!userId) return;
    setFollowAction("loading");
    if (isFollowing) {
      setFollowersCount(prev => Math.max(0, prev - 1));
      await unfollowUser(userId);
    } else {
      setFollowersCount(prev => prev + 1);
      await followUser(userId);
    }
    setFollowAction("none");
  };

  const handleBlock = async () => {
    if (!userId) return;
    if (isBlocked) {
      await supabase.from("blocked_users").delete().match({ blocker_id: user!.id, blocked_id: userId });
      setIsBlocked(false);
      toast({ title: "User unblocked" });
    } else {
      await blockUser(userId);
      setIsBlocked(true);
      // Also unfollow if following
      if (isFollowing) {
        await unfollowUser(userId);
        setFollowersCount(prev => Math.max(0, prev - 1));
      }
      toast({ title: "User blocked", description: "They won't be able to see your profile or interact with you." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">User not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {!isOwnProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowReportSheet(true)} className="text-destructive">
                <Flag className="w-4 h-4 mr-2" /> Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock}>
                <Ban className="w-4 h-4 mr-2" /> {isBlocked ? "Unblock User" : "Block User"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Profile header */}
      <div className="px-5 pb-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-card border border-border flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: profile.avatar_position || 'center' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">{profile.display_name || profile.username}</h2>
            {profile.username && (
              <p className="text-xs text-accent font-medium flex items-center justify-center gap-0.5">
                <AtSign className="w-3 h-3" />{profile.username}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 mt-2">
              <button onClick={() => setFollowListType("followers")} className="text-center">
                <p className="text-sm font-bold text-foreground">{followersCount}</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </button>
              <div className="w-px h-6 bg-border" />
              <button onClick={() => setFollowListType("following")} className="text-center">
                <p className="text-sm font-bold text-foreground">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </button>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-foreground mt-3 leading-relaxed text-center">{profile.bio}</p>
        )}

        {/* Follow button */}
        {!isOwnProfile && (
          <Button
            onClick={handleFollow}
            disabled={followAction === "loading"}
            variant={isFollowing ? "outline" : "default"}
            className="w-full mt-3 h-9 rounded-xl text-xs font-semibold"
          >
            {followAction === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              "Following"
            ) : (
              "Follow"
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {!canView ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">This account is private</p>
          <p className="text-xs text-muted-foreground mt-1">Follow to see their posts and wardrobe</p>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {/* Style */}
          {profile.style_preference && (
            <div className="rounded-2xl bg-card border border-border/40 p-4">
              <p className="text-sm font-semibold text-foreground mb-2">Style</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.style_preference.replace(/,/g, ", ")}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <button onClick={() => setShowWardrobe(true)} className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <Shirt className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold text-foreground">{wardrobeCount}</p>
              <p className="text-[10px] text-muted-foreground">Total Pieces</p>
            </button>
            <button onClick={() => setShowColors(!showColors)} className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <Palette className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold text-foreground">{colorCount}</p>
              <p className="text-[10px] text-muted-foreground">Colours</p>
            </button>
            <button onClick={() => setShowCategories(!showCategories)} className="rounded-2xl bg-card border border-border/40 p-3 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold text-foreground">{categoryBreakdown.filter(c => c.count > 0).length}</p>
              <p className="text-[10px] text-muted-foreground">Categories</p>
            </button>
          </div>

          {/* Color breakdown (expandable) */}
          {showColors && userColors.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/40 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Colour Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {userColors.map(([color, count]) => (
                  <div key={color} className="text-center px-3 py-1.5 rounded-xl bg-muted">
                    <p className="text-xs font-medium text-foreground capitalize">{color}</p>
                    <p className="text-[10px] text-muted-foreground">{count} items</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category breakdown (expandable) */}
          {showCategories && (
            <div className="rounded-2xl bg-card border border-border/40 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Category Breakdown</p>
              <div className="space-y-2">
                {categoryBreakdown.filter(c => c.count > 0).map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{cat.icon} {cat.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: wardrobeCount ? `${(cat.count / wardrobeCount) * 100}%` : "0%" }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-4 text-right">{cat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fit Pics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Fit Pics</p>
            </div>
            {fitPics.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-12">No fit pics yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {fitPics.map((pic) => (
                  <div key={pic.id} className="aspect-square relative">
                    <img src={pic.image_url} alt={pic.description || ""} className="w-full h-full object-cover rounded-sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {userId && (
        <>
          <FollowListSheet
            open={followListType !== null}
            onOpenChange={(open) => { if (!open) setFollowListType(null); }}
            userId={userId}
            type={followListType || "followers"}
          />
          <UserWardrobeSheet
            open={showWardrobe}
            onOpenChange={setShowWardrobe}
            userId={userId}
            displayName={profile?.display_name || profile?.username || "User"}
          />
          <ReportSheet
            open={showReportSheet}
            onOpenChange={setShowReportSheet}
            reportedUserId={userId}
            reportType="user"
          />
        </>
      )}
    </div>
  );
}
