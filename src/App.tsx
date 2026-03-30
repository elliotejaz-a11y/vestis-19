import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/useWardrobe";
import { useRecentlyDeleted } from "@/hooks/useRecentlyDeleted";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppTutorial } from "@/components/AppTutorial";
import { SwipeNavigator } from "@/components/SwipeNavigator";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { preloadBgRemovalModel } from "@/lib/image-processing";
import { ClothingItem } from "@/types/wardrobe";

// Lazy-loaded page components
const Wardrobe = lazy(() => import("./pages/Wardrobe"));
const AddItem = lazy(() => import("./pages/AddItem"));
const Outfits = lazy(() => import("./pages/Outfits"));
const OutfitBuilder = lazy(() => import("./pages/OutfitBuilder"));
const Profile = lazy(() => import("./pages/Profile"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const FeedbackPage = lazy(() => import("./pages/Feedback"));
const SocialFeed = lazy(() => import("./pages/SocialFeed"));
const UserProfilePage = lazy(() => import("./pages/UserProfile"));
const Friends = lazy(() => import("./pages/Friends"));
const Chat = lazy(() => import("./pages/Chat"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/policies/Terms"));
const Privacy = lazy(() => import("./pages/policies/Privacy"));
const Community = lazy(() => import("./pages/policies/Community"));
const Cookies = lazy(() => import("./pages/policies/Cookies"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-accent" />
  </div>
);

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }
  if (profile && !profile.onboarding_completed) return <Suspense fallback={<PageLoader />}><Onboarding /></Suspense>;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { items, outfits, addItem, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState, loading } = useWardrobe();
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

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <SwipeNavigator>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      </SwipeNavigator>
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
