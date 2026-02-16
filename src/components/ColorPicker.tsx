import { cn } from "@/lib/utils";

const COLORS = ["Black", "White", "Navy", "Beige", "Brown", "Red", "Blue", "Green", "Pink", "Gray", "Burgundy", "Olive", "Cream", "Tan", "Charcoal"];

interface Props {
  selected: string[];
  onChange: (colors: string[]) => void;
}

export function ColorPicker({ selected, onChange }: Props) {
  const toggle = (color: string) => {
    if (selected.includes(color)) {
      onChange(selected.filter((c) => c !== color));
    } else {
      onChange([...selected, color]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => toggle(c)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border",
            selected.includes(c)
              ? "bg-accent text-accent-foreground border-accent"
              : "bg-card text-muted-foreground border-border hover:border-accent/50"
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function parseColors(color: string): string[] {
  if (!color) return [];
  return color.split(",").map((c) => c.trim()).filter(Boolean);
}

export function joinColors(colors: string[]): string {
  return colors.join(", ");
}
