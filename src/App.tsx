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

import { PageSkeleton } from "@/components/PageSkeleton";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { ClothingItem } from "@/types/wardrobe";
import { ThemeProvider } from "next-themes";

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

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || sessionStorage.getItem("vestis_recovery_mode") === "true") {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }
  if (profile && !profile.onboarding_completed) return <Suspense fallback={<PageSkeleton />}><Onboarding /></Suspense>;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { items, outfits, addItem, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState, loading } = useWardrobe();
  const { deletedItems, addToDeleted, removeFromDeleted } = useRecentlyDeleted();

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
      <div style={{ minHeight: "100%" }}>
      <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={
          loading ? <PageSkeleton /> :
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
        <Route path="/outfits" element={
          loading ? <PageSkeleton /> :
          <Outfits items={items} outfits={outfits} onGenerate={generateOutfit} onSave={saveOutfit} onDelete={deleteOutfit} />
        } />
        <Route path="/builder" element={
          loading ? <PageSkeleton /> :
          <OutfitBuilder items={items} onSaveOutfit={saveOutfit} onOutfitCreated={addOutfitToState} />
        } />
        <Route path="/friends" element={<Friends />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/calendar" element={
          loading ? <PageSkeleton /> :
          <CalendarPage outfits={outfits} />
        } />
        <Route path="/profile" element={
          loading ? <PageSkeleton /> :
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
      </div>
      <BottomNav />
      <AppTutorial />
    </div>
  );
}

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
