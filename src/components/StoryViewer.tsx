import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Story, StorySlide } from "@/hooks/useStories";

interface Props {
  stories: Story[];
  initialStoryIndex?: number;
  getSlideUrl: (path: string | null) => Promise<string | null>;
  onClose: () => void;
  onView?: (storyId: string) => void;
}

export function StoryViewer({ stories, initialStoryIndex = 0, getSlideUrl, onClose, onView }: Props) {
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [slideUrls, setSlideUrls] = useState<Record<string, string | null>>({});
  const [paused, setPaused] = useState(false);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);

  const currentStory = stories[storyIdx];
  const currentSlides = currentStory?.slides ?? [];
  const currentSlide: StorySlide | undefined = currentSlides[slideIdx];
  const slideDurationMs = (currentSlide?.duration ?? 5) * 1000;

  // Preload slide URLs for current story
  useEffect(() => {
    if (!currentStory) return;
    currentStory.slides.forEach((slide) => {
      if (slide.media_url && !(slide.id in slideUrls)) {
        getSlideUrl(slide.media_url).then((url) => {
          setSlideUrls((prev) => ({ ...prev, [slide.id]: url }));
        });
      }
    });
  }, [currentStory, getSlideUrl]);

  // Notify view
  useEffect(() => {
    if (currentStory && onView) onView(currentStory.id);
  }, [currentStory?.id]);

  const goNext = useCallback(() => {
    accumulatedRef.current = 0;
    if (slideIdx < currentSlides.length - 1) {
      setSlideIdx((i) => i + 1);
      setProgress(0);
    } else if (storyIdx < stories.length - 1) {
      setStoryIdx((i) => i + 1);
      setSlideIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [slideIdx, currentSlides.length, storyIdx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    accumulatedRef.current = 0;
    setProgress(0);
    if (slideIdx > 0) {
      setSlideIdx((i) => i - 1);
    } else if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      setSlideIdx(0);
    }
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
      if (pct >= 100) {
        clearInterval(progressRef.current!);
        goNext();
      }
    }, 50);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [slideIdx, storyIdx, paused, slideDurationMs, goNext]);

  // Tap zones
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX / e.currentTarget.offsetWidth;
    if (x < 0.33) goPrev();
    else if (x > 0.67) goNext();
  };

  // Long press to pause
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePointerDown = () => {
    holdTimer.current = setTimeout(() => {
      setPaused(true);
      if (progressRef.current) clearInterval(progressRef.current);
      accumulatedRef.current += Date.now() - startTimeRef.current;
    }, 200);
  };
  const handlePointerUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (paused) {
      setPaused(false);
      startTimeRef.current = Date.now();
    }
  };

  if (!currentStory || currentSlides.length === 0) return null;

  const mediaUrl = currentSlide ? slideUrls[currentSlide.id] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-safe pt-3">
        {currentSlides.map((slide, i) => (
          <div key={slide.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width:
                  i < slideIdx
                    ? "100%"
                    : i === slideIdx
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-8 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Media */}
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
              autoPlay
              playsInline
              muted
              loop={false}
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

        {/* Tap hint arrows (subtle) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none">
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none">
          <ChevronRight className="w-6 h-6 text-white/60" />
        </div>
      </div>
    </div>
  );
}
