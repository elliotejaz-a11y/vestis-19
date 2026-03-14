import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/useWardrobe";
import { useRecentlyDeleted } from "@/hooks/useRecentlyDeleted";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Wardrobe from "./pages/Wardrobe";
import AddItem from "./pages/AddItem";
import Outfits from "./pages/Outfits";
import OutfitBuilder from "./pages/OutfitBuilder";
import Profile from "./pages/Profile";
import CalendarPage from "./pages/Calendar";
import FeedbackPage from "./pages/Feedback";
import SocialFeed from "./pages/SocialFeed";
import UserProfilePage from "./pages/UserProfile";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Terms from "./pages/policies/Terms";
import Privacy from "./pages/policies/Privacy";
import Community from "./pages/policies/Community";
import Cookies from "./pages/policies/Cookies";
import ResetPassword from "./pages/ResetPassword";
import { AppTutorial } from "@/components/AppTutorial";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { preloadBgRemovalModel } from "@/lib/image-processing";
import { ClothingItem } from "@/types/wardrobe";

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
  const { items, outfits, addItem, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState } = useWardrobe();
  const { deletedItems, addToDeleted, removeFromDeleted } = useRecentlyDeleted();

  // Preload bg-removal model assets so first upload is fast
  useEffect(() => { preloadBgRemovalModel(); }, []);

  const handleSoftRemove = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      addToDeleted(item);
    }
    removeItem(id);
  }, [items, addToDeleted, removeItem]);

  const handleRestore = useCallback(async (item: ClothingItem) => {
    await addItem(item);
    removeFromDeleted(item.id);
  }, [addItem, removeFromDeleted]);

  const handlePermanentDelete = useCallback((id: string) => {
    removeFromDeleted(id);
  }, [removeFromDeleted]);

  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <Routes>
        <Route path="/" element={
          <Wardrobe
            items={items}
            outfits={outfits}
            onAdd={addItem}
            onRemove={handleSoftRemove}
            onUpdate={updateItem}
            onSaveOutfit={saveOutfit}
            onDeleteOutfit={deleteOutfit}
            onRetryBackgroundRemoval={retryBackgroundRemoval}
          />
        } />
        <Route path="/add" element={<AddItem onAdd={addItem} />} />
        <Route path="/outfits" element={<Outfits items={items} outfits={outfits} onGenerate={generateOutfit} onSave={saveOutfit} onDelete={deleteOutfit} />} />
        <Route path="/builder" element={<OutfitBuilder items={items} onSaveOutfit={saveOutfit} onOutfitCreated={addOutfitToState} />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/calendar" element={<CalendarPage outfits={outfits} />} />
        <Route path="/profile" element={
          <Profile
            items={items}
            outfits={outfits}
            onSaveOutfit={saveOutfit}
            onDeleteOutfit={deleteOutfit}
            deletedItems={deletedItems}
            onRestoreItem={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        } />
        <Route path="/social" element={<SocialFeed />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/policies/terms" element={<Terms />} />
        <Route path="/policies/privacy" element={<Privacy />} />
        <Route path="/policies/community" element={<Community />} />
        <Route path="/policies/cookies" element={<Cookies />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <AppTutorial />
    </div>
  );
}

import { ThemeProvider } from "next-themes";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
