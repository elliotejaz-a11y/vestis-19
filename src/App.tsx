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
import { MassUploadProvider } from "@/contexts/MassUploadContext";
import { MassUploadProgressBanner } from "@/components/MassUploadProgressBanner";
import { MassUploadReviewSheet } from "@/components/MassUploadReviewSheet";

import { lazy, Suspense, useCallback, useEffect } from "react";
import { ClothingItem } from "@/types/wardrobe";
import { ThemeProvider } from "next-themes";

// Lazy-loaded page components — assigned to variables so we can preload them
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
const LaunchVideo = lazy(() => import("./components/VestisLaunchVideo"));

// Eagerly preload ALL route chunks so every tab is instant on first tap.
// This runs in the background after initial paint — users see the current page
// immediately while the rest downloads silently.
function preloadAllRoutes() {
  const routes = [
    () => import("./pages/Wardrobe"),
    () => import("./pages/AddItem"),
    () => import("./pages/Outfits"),
    () => import("./pages/OutfitBuilder"),
    () => import("./pages/Profile"),
    () => import("./pages/Calendar"),
    () => import("./pages/Feedback"),
    () => import("./pages/SocialFeed"),
    () => import("./pages/UserProfile"),
    () => import("./pages/Friends"),
    () => import("./pages/Chat"),
  ];
  // Stagger imports slightly so we don't block the main thread
  routes.forEach((load, i) => {
    setTimeout(load, i * 100);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Invisible fallback — no skeleton, no spinner
const Noop = () => <div />;

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  // Preload all route chunks once auth resolves
  useEffect(() => {
    if (!loading && user) {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(preloadAllRoutes);
      } else {
        setTimeout(preloadAllRoutes, 200);
      }
    }
  }, [loading, user]);

  // Public routes accessible without auth
  const location = window.location.pathname;
  if (location === "/launch-video") {
    return (
      <Suspense fallback={<Noop />}>
        <LaunchVideo />
      </Suspense>
    );
  }

  if (loading) return <div />;

  if (!user || sessionStorage.getItem("vestis_recovery_mode") === "true") {
    return (
      <Suspense fallback={<Noop />}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }
  if (profile && !profile.onboarding_completed) return <Suspense fallback={<Noop />}><Onboarding /></Suspense>;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { items, outfits, addItem, addItemToState, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState, dataReady } = useWardrobe();
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
    <MassUploadProvider onAdd={addItem}>
    <div className="max-w-lg mx-auto min-h-screen relative">
      <MassUploadProgressBanner />
      <div style={{ minHeight: "100%" }}>
      <Suspense fallback={<Noop />}>
      <Routes>
        <Route path="/" element={
          <Wardrobe
            items={items}
            outfits={outfits}
            onAdd={addItem}
            onAddDuplicated={addItemToState}
            onRemove={handleSoftRemove}
            onUpdate={updateItem}
            onSaveOutfit={saveOutfit}
            onDeleteOutfit={deleteOutfit}
            onRetryBackgroundRemoval={retryBackgroundRemoval}
            dataReady={dataReady}
          />
        } />
        <Route path="/add" element={<AddItem onAdd={addItem} />} />
        <Route path="/outfits" element={
          <Outfits items={items} outfits={outfits} onGenerate={generateOutfit} onSave={saveOutfit} onDelete={deleteOutfit} />
        } />
        <Route path="/builder" element={
          <OutfitBuilder items={items} onSaveOutfit={saveOutfit} onOutfitCreated={addOutfitToState} />
        } />
        <Route path="/friends" element={<Friends />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/calendar" element={
          <CalendarPage outfits={outfits} />
        } />
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
      </div>
      <BottomNav />
      <AppTutorial />
      <MassUploadReviewSheet />
    </div>
    </MassUploadProvider>
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
