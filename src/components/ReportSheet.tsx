import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  "Inappropriate content",
  "Harassment or bullying",
  "Spam or scam",
  "Impersonation",
  "Hate speech",
  "Other",
];

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportType: "user" | "post" | "message";
  referenceId?: string;
}

export function ReportSheet({ open, onOpenChange, reportedUserId, reportType, referenceId }: ReportSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        report_type: reportType,
        reason,
        details,
        reference_id: referenceId || null,
      } as any);
      if (error) throw error;
      toast({ title: "Report submitted", description: "We'll review this and take action if needed." });
      onOpenChange(false);
      setReason("");
      setDetails("");
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" /> Report {reportType}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    reason === r
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Additional details (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us more about what happened..."
              className="mt-1 rounded-xl bg-card text-sm"
              rows={3}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="w-full h-11 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
