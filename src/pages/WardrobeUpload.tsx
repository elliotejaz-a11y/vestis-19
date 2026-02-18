import { useState, useRef, useCallback } from "react";
import { useWardrobeItems, WardrobeItem } from "@/hooks/useWardrobeItems";
import { CATEGORIES } from "@/types/wardrobe";
import { Upload, Loader2, RefreshCw, Trash2, Check, AlertTriangle, Clock, Pencil, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

// Checkerboard background for transparent PNGs
const checkerboardStyle: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
    linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
    linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
  `,
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
};

export default function WardrobeUpload() {
  const { items, loading, uploadFiles, retryItem, updateItem, deleteItem } = useWardrobeItems();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      f.type.startsWith("image/") && f.size <= 20 * 1024 * 1024
    ).slice(0, 20);
    if (accepted.length > 0) uploadFiles(accepted);
  }, [uploadFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const filtered = activeFilter === "all" ? items : items.filter((i) => i.category === activeFilter);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wardrobe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
          {items.filter((i) => i.status === "completed").length} processed
        </p>
      </header>

      {/* Upload zone */}
      <div className="px-5 pb-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
            dragActive
              ? "border-accent bg-accent/10 scale-[1.01]"
              : "border-border hover:border-accent/50 hover:bg-card/50"
          )}
        >
          <Upload className={cn("w-7 h-7", dragActive ? "text-accent" : "text-muted-foreground")} />
          <span className="text-xs font-medium text-muted-foreground">
            Drop images here or tap to upload
          </span>
          <span className="text-[10px] text-muted-foreground/60">JPG, PNG · Max 20MB · Up to 20 files</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Category filters */}
      <div className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
            activeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >All</button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              activeFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
            )}
          >{cat.icon} {cat.label}</button>
        ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {items.length === 0 ? "Your wardrobe is empty" : "No items in this category"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
            Upload clothing photos to get started — backgrounds are removed automatically
          </p>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              editing={editingId === item.id}
              onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
              onUpdate={updateItem}
              onRetry={() => retryItem(item.id)}
              onDelete={() => setDeleteId(item.id)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}

function ItemCard({
  item,
  editing,
  onEdit,
  onUpdate,
  onRetry,
  onDelete,
}: {
  item: WardrobeItem;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (id: string, updates: { name?: string; category?: string }) => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const [localName, setLocalName] = useState(item.name);

  const statusConfig = {
    queued: { icon: Clock, label: "Queued", variant: "secondary" as const, color: "text-muted-foreground" },
    processing: { icon: Loader2, label: "Processing", variant: "secondary" as const, color: "text-accent", spin: true },
    completed: { icon: Check, label: "Done", variant: "default" as const, color: "text-green-600" },
    failed: { icon: AlertTriangle, label: "Failed", variant: "destructive" as const, color: "text-destructive" },
  };

  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm">
      {/* Image */}
      <div className="aspect-[3/4] relative">
        {item.status === "completed" && item.cutout_url ? (
          <div className="w-full h-full" style={checkerboardStyle}>
            <img
              src={item.cutout_url}
              alt={item.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ) : item.status === "processing" || item.status === "queued" ? (
          <div className="w-full h-full relative">
            {item.original_url && (
              <img
                src={item.original_url}
                alt={item.name}
                className="w-full h-full object-cover opacity-50"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-[10px] font-medium text-accent">
                {item.status === "queued" ? "Queued..." : "Removing background..."}
              </span>
            </div>
          </div>
        ) : item.status === "failed" ? (
          <div className="w-full h-full relative">
            {item.original_url && (
              <img
                src={item.original_url}
                alt={item.name}
                className="w-full h-full object-cover opacity-40"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <span className="text-[10px] font-medium text-destructive">Failed</span>
              <button
                onClick={onRetry}
                className="mt-1 px-3 py-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={status.variant} className="text-[9px] py-0 px-1.5 gap-1">
            <StatusIcon className={cn("w-2.5 h-2.5", status.color, (status as any).spin && "animate-spin")} />
            {status.label}
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
          >
            <Pencil className="w-3 h-3 text-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3 text-foreground" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        {editing ? (
          <div className="space-y-1.5">
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={() => {
                if (localName !== item.name) onUpdate(item.id, { name: localName });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate(item.id, { name: localName });
                  onEdit();
                }
              }}
              className="h-7 text-xs rounded-lg bg-background"
              autoFocus
            />
            <Select
              value={item.category}
              onValueChange={(val) => {
                onUpdate(item.id, { category: val });
              }}
            >
              <SelectTrigger className="h-7 text-[10px] rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">Other</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{item.category}</p>
          </>
        )}
      </div>
    </div>
  );
}
