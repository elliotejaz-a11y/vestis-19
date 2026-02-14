import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/useWardrobe";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Wardrobe from "./pages/Wardrobe";
import AddItem from "./pages/AddItem";
import Outfits from "./pages/Outfits";
import OutfitBuilder from "./pages/OutfitBuilder";
import Profile from "./pages/Profile";
import CalendarPage from "./pages/Calendar";
import FeedbackPage from "./pages/Feedback";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Auth />;
  if (profile && !profile.onboarding_completed) return <Onboarding />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { items, outfits, addItem, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit } = useWardrobe();

  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <Routes>
        <Route path="/" element={<Wardrobe items={items} onAdd={addItem} onRemove={removeItem} onUpdate={updateItem} />} />
        <Route path="/add" element={<AddItem onAdd={addItem} />} />
        <Route path="/outfits" element={<Outfits items={items} outfits={outfits} onGenerate={generateOutfit} onSave={saveOutfit} onDelete={deleteOutfit} />} />
        <Route path="/builder" element={<OutfitBuilder items={items} />} />
        <Route path="/calendar" element={<CalendarPage outfits={outfits} />} />
        <Route path="/profile" element={<Profile items={items} outfits={outfits} onSaveOutfit={saveOutfit} onDeleteOutfit={deleteOutfit} />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
