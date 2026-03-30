import { SocialStory } from "@/hooks/useSocial";
import { User } from "lucide-react";

interface Props {
  stories: SocialStory[];
  onAdd: () => void;
  onView: (story: SocialStory) => void;
}

export function StoriesBar({ stories, onAdd, onView }: Props) {
  // Group stories by user
  const grouped = stories.reduce<Record<string, SocialStory[]>>((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = [];
    acc[s.user_id].push(s);
    return acc;
  }, {});

  const userStories = Object.entries(grouped).map(([userId, stories]) => ({
    userId,
    latestStory: stories[0],
    user: stories[0].user,
  }));

  return (
    <div className="flex gap-3 overflow-x-auto px-5 py-3 no-scrollbar">
      {/* Add story button */}
      <button onClick={onAdd} className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent flex items-center justify-center bg-card">
          <span className="text-accent text-xl font-bold">+</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Your Story</span>
      </button>

      {/* User stories */}
      {userStories.map(({ userId, latestStory, user }) => (
        <button
          key={userId}
          onClick={() => onView(latestStory)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="w-16 h-16 rounded-full border-2 border-accent p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden bg-card">
              {user?.avatar_url ? (
                <img loading="lazy" src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] text-foreground truncate w-16 text-center">
            {user?.username || user?.display_name || "User"}
          </span>
        </button>
      ))}
    </div>
  );
}
