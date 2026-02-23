import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocial } from "@/hooks/useSocial";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Lock, Loader2, Grid3X3, AtSign, Shirt, Palette, TrendingUp, Camera } from "lucide-react";
import { CATEGORIES } from "@/types/wardrobe";
import FollowListSheet from "@/components/FollowListSheet";
import UserWardrobeSheet from "@/components/UserWardrobeSheet";
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
  const { followingIds, followUser, unfollowUser } = useSocial();
  const navigate = useNavigate();
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

      setLoading(false);
    };
    load();
  }, [userId]);

  const handleFollow = async () => {
    if (!userId) return;
    setFollowAction("loading");
    if (isFollowing) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
    setFollowAction("none");
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);
    setFollowersCount(count || 0);
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
      <header className="px-5 pt-12 pb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
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

          {/* Tabs: Fit Pics / Posts */}
          <div className="flex rounded-xl bg-muted/60 overflow-hidden">
            <button
              onClick={() => setActiveTab("fitpics")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === "fitpics" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <Camera className="w-3.5 h-3.5" /> Fit Pics
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === "posts" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Posts
            </button>
          </div>

          {activeTab === "fitpics" ? (
            fitPics.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-12">No fit pics yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {fitPics.map((pic) => (
                  <div key={pic.id} className="aspect-square relative">
                    <img src={pic.image_url} alt={pic.description || ""} className="w-full h-full object-cover rounded-sm" />
                  </div>
                ))}
              </div>
            )
          ) : (
            <PostsGrid userId={userId!} profileData={profile} />
          )}
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
        </>
      )}
    </div>
  );
}

// Posts grid sub-component
function PostsGrid({ userId, profileData }: { userId: string; profileData: any }) {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("social_posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts(data || []));
  }, [userId]);

  if (posts.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-12">No posts yet</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => (
        <div key={post.id} className="aspect-square">
          <img src={post.image_urls[0]} alt="" className="w-full h-full object-cover rounded-sm" />
        </div>
      ))}
    </div>
  );
}
