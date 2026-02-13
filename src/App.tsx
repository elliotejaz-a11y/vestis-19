import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/useWardrobe";
import Wardrobe from "./pages/Wardrobe";
import AddItem from "./pages/AddItem";
import Outfits from "./pages/Outfits";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { items, outfits, addItem, removeItem, generateOutfit } = useWardrobe();

  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <Routes>
        <Route path="/" element={<Wardrobe items={items} onAdd={addItem} onRemove={removeItem} />} />
        <Route path="/add" element={<AddItem onAdd={addItem} />} />
        <Route path="/outfits" element={<Outfits items={items} outfits={outfits} onGenerate={generateOutfit} />} />
        <Route path="/profile" element={<Profile items={items} />} />
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
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
