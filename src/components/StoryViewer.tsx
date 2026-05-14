import { useState, useEffect, useRef, useCallback } from "react";
import { X, Music2, Eye, Send, MessageCircle } from "lucide-react";
import { Story, StorySlide } from "@/hooks/useStories";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";

export interface StoryOwner {
  id: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatarPosition?: string | null;
}

interface Props {
  stories: Story[];
  initialStoryIndex?: number;
  getSlideUrl: (path: string | null) => Promise<string | null>;
  onClose: () => void;
  onView?: (storyId: string) => void;
  isOwner?: boolean;
  owner?: StoryOwner;
}

export function StoryViewer({
  stories,
  initialStoryIndex = 0,
  getSlideUrl,
  onClose,
  onView,
  isOwner = false,
  owner,
}: Props) {
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [slideUrls, setSlideUrls] = useState<Record<string, string | null>>({});
  const [paused, setPaused] = useState(false);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStory = stories[storyIdx];
  const currentSlides = currentStory?.slides ?? [];
  const currentSlide: StorySlide | undefined = currentSlides[slideIdx];
  const slideDurationMs = (currentSlide?.duration ?? 5) * 1000;
  const hasMusic = !!currentSlide?.music_preview_url;

  // Preload media URLs
  useEffect(() => {
    if (!currentStory) return;
    currentStory.slides.forEach((slide) => {
      if (slide.media_url && !(slide.id in slideUrls)) {
        getSlideUrl(slide.media_url).then((url) =>
          setSlideUrls((prev) => ({ ...prev, [slide.id]: url }))
        );
      }
    });
  }, [currentStory, getSlideUrl]);

  // Record view
  useEffect(() => {
    if (currentStory && onView) onView(currentStory.id);
  }, [currentStory?.id]);

  // Music
  useEffect(() => {
    const url = currentSlide?.music_preview_url;
    if (!url) { audioRef.current?.pause(); return; }
    if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.volume = 0.7; }
    const audio = audioRef.current;
    if (audio.src !== url) { audio.src = url; audio.currentTime = currentSlide?.music_start_offset ?? 0; }
    audio.play().catch(() => {});
    return () => { audio.pause(); };
  }, [currentSlide?.music_preview_url]);

  useEffect(() => {
    if (!audioRef.current || !hasMusic) return;
    if (paused) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  }, [paused, hasMusic]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const goNext = useCallback(() => {
    accumulatedRef.current = 0;
    if (slideIdx < currentSlides.length - 1) { setSlideIdx((i) => i + 1); setProgress(0); }
    else if (storyIdx < stories.length - 1) { setStoryIdx((i) => i + 1); setSlideIdx(0); setProgress(0); }
    else { onClose(); }
  }, [slideIdx, currentSlides.length, storyIdx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    accumulatedRef.current = 0;
    setProgress(0);
    if (slideIdx > 0) setSlideIdx((i) => i - 1);
    else if (storyIdx > 0) { setStoryIdx((i) => i - 1); setSlideIdx(0); }
  }, [slideIdx, storyIdx]);

  // Progress timer
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    accumulatedRef.current = 0;
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = accumulatedRef.current + (Date.now() - startTimeRef.current);
      const pct = Math.min((elapsed / slideDurationMs) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(progressRef.current!); goNext(); }
    }, 50);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [slideIdx, storyIdx, paused, slideDurationMs, goNext]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX / e.currentTarget.offsetWidth;
    if (x < 0.33) goPrev();
    else if (x > 0.67) goNext();
  };

  const handlePointerDown = () => {
    holdTimer.current = setTimeout(() => {
      setPaused(true);
      if (progressRef.current) clearInterval(progressRef.current);
      accumulatedRef.current += Date.now() - startTimeRef.current;
    }, 200);
  };

  const handlePointerUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (paused) { setPaused(false); startTimeRef.current = Date.now(); }
  };

  if (!currentStory || currentSlides.length === 0) return null;

  const mediaUrl = currentSlide ? slideUrls[currentSlide.id] : null;
  const timeAgo = formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: false });
  const displayName = owner?.displayName || owner?.username || "Your story";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden">

      {/* ── Progress bars ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-10">
        {currentSlides.map((slide, i) => (
          <div key={slide.id} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < slideIdx ? "100%" : i === slideIdx ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2.5 px-3 pt-14 pb-3">
        <div className="relative flex-shrink-0">
          <UserAvatar
            avatarUrl={owner?.avatarUrl}
            avatarPreset={owner?.avatarPreset}
            avatarPosition={owner?.avatarPosition}
            displayName={displayName}
            className="w-9 h-9 border-2 border-white/60"
          />
          {isOwner && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent border border-black flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">+</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">
            {isOwner ? "Your story" : (owner?.username ?? displayName)}
          </p>
          <p className="text-white/60 text-xs leading-tight">{timeAgo}</p>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Media ── */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {mediaUrl ? (
          currentSlide?.media_type === "video" ? (
            <video
              key={mediaUrl}
              src={mediaUrl}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay playsInline muted={hasMusic} loop={false}
            />
          ) : (
            <img
              key={mediaUrl}
              src={mediaUrl}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
              draggable={false}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Music label */}
        {hasMusic && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm pointer-events-none">
            <Music2 className="w-3 h-3 text-white animate-pulse" />
            <span className="text-white text-xs font-medium truncate max-w-[180px]">
              {currentSlide?.music_track_name}
              {currentSlide?.music_artist_name ? ` — ${currentSlide.music_artist_name}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      {isOwner && (
        <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm px-4 pt-3 pb-safe pb-6">
          <div className="flex items-center justify-around">
            <button className="flex flex-col items-center gap-1 opacity-80">
              <div className="flex items-center gap-1.5">
                <Eye className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-semibold">{currentStory.view_count}</span>
              </div>
              <span className="text-white/60 text-[10px]">Activity</span>
            </button>
            <button className="flex flex-col items-center gap-1 opacity-80">
              <Send className="w-5 h-5 text-white" />
              <span className="text-white/60 text-[10px]">Share</span>
            </button>
            <button className="flex flex-col items-center gap-1 opacity-80">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-white/60 text-[10px]">Mention</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
