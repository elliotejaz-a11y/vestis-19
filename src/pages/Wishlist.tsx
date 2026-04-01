import { useState, useEffect, useCallback, useRef } from "react";
import { Heart, Plus, Trash2, X, Camera, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/types/wardrobe";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

const FABRICS = ["Canvas","Cashmere","Chiffon","Cotton","Denim","Faux Leather","Gold","Gore-Tex","Knit","Leather","Linen","Mesh","Metal","Nylon","Platinum","Polyester","Rubber","Satin","Silk","Silver","Spandex","Stainless Steel","Suede","Titanium","Velvet","Wool"];

interface WishlistItem {
  id: string;
  name: string;
  image_url: string;
  estimated_price: number | null;
  brand: string;
  color: string;
  fabric: string;
  size: string;
  category: string;
  notes: string;
  created_at: string;
}

export default function Wishlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<WishlistItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Add form state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Online search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as WishlistItem[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setName(""); setImageUrl(""); setPrice(""); setBrand("");
    setColor(""); setFabric(""); setSize(""); setCategory("");
    setNotes(""); setImageFile(null); setSearchQuery("");
    setSearchResults([]); setShowSearch(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const { data } = await supabase.functions.invoke("search-clothing-images", {
        body: { query: searchQuery.trim() },
      });
      setSearchResults(data?.images || []);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);

    let finalImageUrl = imageUrl;

    // Upload file if user selected one
    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/wishlist-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("clothing-images").upload(path, imageFile);
      if (upErr) {
        toast({ title: "Upload failed", variant: "destructive" });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
      finalImageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("wishlist_items").insert({
      user_id: user.id,
      name: name.trim(),
      image_url: finalImageUrl,
      estimated_price: price ? parseFloat(price) : null,
      brand: brand.trim(),
      color: color.trim(),
      fabric,
      size: size.trim(),
      category,
      notes: notes.trim(),
    });

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Added to wishlist!" });
      resetForm();
      setAddOpen(false);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteTarget(null);
    if (detailItem?.id === id) setDetailItem(null);
    toast({ title: "Removed from wishlist" });
  };

  return (
    <div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-5">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Heart className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Your wishlist is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">Tap the + button to add items you want</p>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetailItem(item)}
            >
              <div className="aspect-[3/4] bg-white dark:bg-neutral-800">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Heart className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
                {item.estimated_price != null && (
                  <p className="text-[10px] font-medium text-accent">${item.estimated_price.toFixed(2)}</p>
                )}
                {item.brand && <p className="text-[10px] text-muted-foreground truncate">{item.brand}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => { resetForm(); setAddOpen(true); }}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Item Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto pb-28" style={{ zIndex: 10000 }}>
          <SheetHeader>
            <SheetTitle>Add to Wishlist</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Image */}
            <div>
              <Label>Photo</Label>
              {imageUrl ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white dark:bg-neutral-800 mt-1">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button onClick={() => { setImageUrl(""); setImageFile(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-1" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowSearch(!showSearch)}>
                    <Search className="w-4 h-4 mr-1" /> Search Online
                  </Button>
                </div>
              )}
              {showSearch && !imageUrl && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Search for an item..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                    <Button size="sm" onClick={handleSearch} disabled={searching}>
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {searchResults.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-accent" onClick={() => { setImageUrl(url); setShowSearch(false); }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Item Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nike Air Max 90" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Colour</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Black" className="mt-1" />
              </div>
              <div>
                <Label>Size</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, 10" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Material</Label>
                <Select value={fabric} onValueChange={setFabric}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 10001 }}>
                    {FABRICS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 10001 }}>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." rows={2} className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
              Add to Wishlist
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto pb-28" style={{ zIndex: 10000 }}>
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle>{detailItem.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {detailItem.image_url && (
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-white dark:bg-neutral-800">
                    <img src={detailItem.image_url} alt={detailItem.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailItem.estimated_price != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Price</p>
                      <p className="font-semibold text-foreground">${detailItem.estimated_price.toFixed(2)}</p>
                    </div>
                  )}
                  {detailItem.brand && (
                    <div>
                      <p className="text-muted-foreground text-xs">Brand</p>
                      <p className="font-medium text-foreground">{detailItem.brand}</p>
                    </div>
                  )}
                  {detailItem.color && (
                    <div>
                      <p className="text-muted-foreground text-xs">Colour</p>
                      <p className="font-medium text-foreground">{detailItem.color}</p>
                    </div>
                  )}
                  {detailItem.fabric && (
                    <div>
                      <p className="text-muted-foreground text-xs">Material</p>
                      <p className="font-medium text-foreground">{detailItem.fabric}</p>
                    </div>
                  )}
                  {detailItem.size && (
                    <div>
                      <p className="text-muted-foreground text-xs">Size</p>
                      <p className="font-medium text-foreground">{detailItem.size}</p>
                    </div>
                  )}
                  {detailItem.category && (
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="font-medium text-foreground capitalize">{detailItem.category}</p>
                    </div>
                  )}
                </div>
                {detailItem.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="text-sm text-foreground mt-0.5">{detailItem.notes}</p>
                  </div>
                )}
                <Button variant="destructive" className="w-full" onClick={() => setDeleteTarget(detailItem.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Remove from Wishlist
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
