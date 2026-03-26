import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function WardrobeServiceSheet({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isValid = fullName.trim() && email.trim() && phone.trim() && address.trim() && preferredDate;

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("wardrobe_service_requests" as any).insert({
        user_id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        preferred_date: preferredDate,
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      // Reset on close
      setTimeout(() => {
        setFullName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setPreferredDate("");
        setSubmitted(false);
      }, 300);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto pb-24">
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Request Submitted!</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              We'll be in touch shortly to confirm your wardrobe upload appointment. Thank you!
            </p>
            <Button onClick={() => handleOpenChange(false)} className="mt-2 h-11 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90">
              Done
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="mb-5">
              <SheetTitle className="text-lg font-bold text-foreground">Wardrobe Upload Service</SheetTitle>
            </SheetHeader>

            <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4 mb-5">
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">$100 NZD — Professional Upload</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    A Vestis team member will visit your home and photograph & upload your entire wardrobe to the app for you.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-xl bg-card"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl bg-card"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+64 21 123 4567"
                  className="rounded-xl bg-card"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your home address"
                  className="rounded-xl bg-card"
                  maxLength={300}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferred Date</label>
                <Input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="rounded-xl bg-card"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className="w-full h-12 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 mt-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? "Submitting..." : "Apply for Service — $100 NZD"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
