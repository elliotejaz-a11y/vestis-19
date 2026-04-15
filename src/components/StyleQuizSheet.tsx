import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STYLES } from "@/pages/Onboarding";

const QUIZ_QUESTIONS = [
  {
    question: "What's your go-to weekend outfit?",
    options: [
      { label: "Jeans and a tee", tags: ["casual", "minimalist"] },
      { label: "Tracksuit or athleisure", tags: ["sporty", "streetwear"] },
      { label: "Something tailored or put-together", tags: ["classic", "business-casual"] },
      { label: "Vintage finds or thrift pieces", tags: ["vintage", "grunge"] },
    ],
  },
  {
    question: "Which word best describes your vibe?",
    options: [
      { label: "Effortless", tags: ["casual", "minimalist"] },
      { label: "Bold", tags: ["streetwear", "techwear"] },
      { label: "Polished", tags: ["elegant", "old-money"] },
      { label: "Creative", tags: ["vintage", "grunge"] },
    ],
  },
  {
    question: "What colours do you reach for most?",
    options: [
      { label: "Black, white, grey", tags: ["minimalist", "techwear"] },
      { label: "Earth tones — browns, olives, tans", tags: ["casual", "vintage"] },
      { label: "Navy, burgundy, forest green", tags: ["classic", "preppy", "old-money"] },
      { label: "Bright or mixed colours", tags: ["streetwear", "sporty"] },
    ],
  },
  {
    question: "Pick a setting you'd love to dress for:",
    options: [
      { label: "A rooftop cocktail bar", tags: ["elegant", "old-money"] },
      { label: "A music festival", tags: ["grunge", "streetwear"] },
      { label: "A coffee shop or bookstore", tags: ["casual", "preppy"] },
      { label: "A city street photoshoot", tags: ["techwear", "minimalist"] },
    ],
  },
  {
    question: "How do you feel about accessories?",
    options: [
      { label: "Keep it simple — watch or ring at most", tags: ["minimalist", "classic"] },
      { label: "Love hats, chains, and statement pieces", tags: ["streetwear", "grunge"] },
      { label: "Quality over quantity — a few luxury items", tags: ["old-money", "elegant"] },
      { label: "Functional — bags, caps, trainers", tags: ["sporty", "techwear"] },
    ],
  },
];

interface StyleQuizSheetProps {
  open: boolean;
  onClose: () => void;
  onResult: (styles: string[]) => void;
}

export function StyleQuizSheet({ open, onClose, onResult }: StyleQuizSheetProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setCurrentQ(0);
    setAnswers([]);
    setAnalysing(false);
  };

  const handleSelect = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      analyseResults(newAnswers);
    }
  };

  const goBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setAnswers(answers.slice(0, -1));
    }
  };

  const analyseResults = async (allAnswers: number[]) => {
    setAnalysing(true);

    // Tally tags from answers
    const tagCounts: Record<string, number> = {};
    allAnswers.forEach((ansIdx, qIdx) => {
      const tags = QUIZ_QUESTIONS[qIdx].options[ansIdx].tags;
      tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    // Sort by count descending and pick top 3
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    const top3 = sorted.slice(0, 3);

    // Validate against known styles
    const knownValues = STYLES.map((s) => s.value);
    const validStyles = top3.filter((s) => knownValues.includes(s));

    // If we have fewer than 3, pad from sorted list
    for (const tag of sorted) {
      if (validStyles.length >= 3) break;
      if (!validStyles.includes(tag) && knownValues.includes(tag)) {
        validStyles.push(tag);
      }
    }

    setAnalysing(false);
    onResult(validStyles.slice(0, 3));
    toast({
      title: "Style match found! ✨",
      description: `Your top styles: ${validStyles
        .slice(0, 3)
        .map((v) => STYLES.find((s) => s.value === v)?.label || v)
        .join(", ")}`,
    });
    reset();
  };

  const q = QUIZ_QUESTIONS[currentQ];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 pt-4 max-h-[85vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold text-foreground">
            {analysing ? "Analysing your style..." : "Style Quiz"}
          </SheetTitle>
        </SheetHeader>

        {analysing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-sm text-muted-foreground">Finding your perfect aesthetic...</p>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex gap-1.5 mb-5">
              {QUIZ_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full flex-1 transition-all",
                    i <= currentQ ? "bg-accent" : "bg-border"
                  )}
                />
              ))}
            </div>

            <p className="text-sm font-semibold text-foreground mb-4">
              {q.question}
            </p>

            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className="w-full text-left p-4 rounded-2xl border-2 border-border bg-card hover:border-accent/60 transition-all text-sm font-medium text-foreground"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {currentQ > 0 && (
              <Button
                variant="ghost"
                onClick={goBack}
                className="mt-4 text-sm text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Previous question
              </Button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
