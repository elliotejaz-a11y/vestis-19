import { Shirt, User, MessageCircle, CalendarDays } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import vestisIcon from "@/assets/vestis-favicon.png";
import vestisIconGrey from "@/assets/vestis-favicon-grey.png";

const tabs = [
  { path: "/", icon: Shirt, label: "Wardrobe" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/outfits", icon: null, label: "Outfits", isCenter: true },
  { path: "/chat", icon: MessageCircle, label: "Socials" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/60">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, icon: Icon, label, isCenter }) => {
          const active = location.pathname === path;

          if (isCenter) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-5"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
                  "bg-card border border-border"
                )}>
                  <img src={active ? vestisIcon : vestisIconGrey} alt="Outfits" className="w-7 h-7" />
                </div>
                <span className={cn("text-[9px] font-medium tracking-wide", active ? "text-accent" : "text-muted-foreground")}>{label}</span>
              </button>
            );
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200",
                active
                  ? "text-accent scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />}
              <span className="text-[9px] font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
