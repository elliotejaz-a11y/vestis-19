import { ClothingCategory } from "@/types/wardrobe";

export interface MassUploadBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MassUploadDetectedItem {
  id: string;
  name: string;
  category: ClothingCategory;
  color: string;
  fabric: string;
  tags: string[];
  notes: string;
  estimatedPrice?: number;
  confidence?: number;
  cropHint?: string;
  bbox?: MassUploadBoundingBox;
}

export type MassUploadPreviewStatus = "idle" | "extracting" | "ready" | "failed";
export type MassUploadAddState = "idle" | "saving" | "saved" | "skipped";

export interface MassUploadCandidate extends MassUploadDetectedItem {
  previewUrl?: string;
  previewStatus: MassUploadPreviewStatus;
  addState: MassUploadAddState;
  error?: string | null;
  croppedBase64?: string;
}

export const WARDROBE_FABRICS = [
  "Canvas",
  "Cashmere",
  "Chiffon",
  "Cotton",
  "Denim",
  "Faux Leather",
  "Gold",
  "Gore-Tex",
  "Knit",
  "Leather",
  "Linen",
  "Mesh",
  "Metal",
  "Nylon",
  "Platinum",
  "Polyester",
  "Rubber",
  "Satin",
  "Silk",
  "Silver",
  "Spandex",
  "Stainless Steel",
  "Suede",
  "Titanium",
  "Velvet",
  "Wool",
] as const;