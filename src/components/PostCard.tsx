import { SocialPost } from "@/hooks/useSocial";
import { Heart, MessageCircle, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  post: SocialPost;
  onLike: (postId: string, liked: boolean) => void;
  onDelete?: (postId: string) => void;
  isOwn?: boolean;
}

export function PostCard({ post, onLike, onDelete, isOwn }: Props) {
  const [currentImage, setCurrentImage] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="bg-card border-y border-border/40">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0"
        >
          {post.user?.avatar_url ? (
            <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </button>
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="text-xs font-semibold text-foreground hover:underline"
        >
          {post.user?.username || post.user?.display_name || "User"}
        </button>
        {isOwn && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Images */}
      <div className="relative aspect-square bg-muted">
        <img
          src={post.image_urls[currentImage]}
          alt=""
          className="w-full h-full object-cover"
        />
        {post.image_urls.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {post.image_urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentImage ? "bg-accent w-3" : "bg-background/60"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 space-y-1.5">
        <div className="flex items-center gap-3">
          <button onClick={() => onLike(post.id, !!post.liked_by_me)}>
            <Heart
              className={cn(
                "w-6 h-6 transition-all",
                post.liked_by_me ? "fill-accent text-accent" : "text-foreground"
              )}
            />
          </button>
          <MessageCircle className="w-6 h-6 text-foreground" />
        </div>
        {post.likes_count > 0 && (
          <p className="text-xs font-semibold text-foreground">{post.likes_count} likes</p>
        )}
        {post.caption && (
          <p className="text-xs text-foreground">
            <span className="font-semibold mr-1">{post.user?.username || "user"}</span>
            {post.caption}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
