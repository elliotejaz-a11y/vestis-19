import { XCircle } from "lucide-react";

export default function PremiumCancel() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            No worries - your upgrade was cancelled
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have not been charged. Return to Vestis any time to upgrade.
          </p>
        </div>

        <a
          href="vestisapp://premium/cancel"
          className="block w-full rounded-2xl bg-accent text-accent-foreground text-sm font-semibold h-12 flex items-center justify-center hover:bg-accent/90 transition-colors"
        >
          Back to Vestis
        </a>

        <p className="text-xs text-muted-foreground">
          If the button above does not open the app, return to it manually.
        </p>
      </div>
    </div>
  );
}
