import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CheckCheck, Users } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: Props) {
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "new_follower": return <UserPlus className="w-4 h-4 text-accent" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto bg-background pb-24">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold tracking-tight">Notifications</SheetTitle>
            {notifications.some(n => !n.read) && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-accent">
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-colors",
                  n.read ? "bg-card" : "bg-accent/10 border border-accent/20"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {n.from_profile?.avatar_url ? (
                    <img src={n.from_profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    getIcon(n.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
