import { cn } from "@/lib/utils";

const COLOR_GROUPS: { label: string; colors: string[] }[] = [
  {
    label: "Other",
    colors: ["Multicolour"],
  },
  {
    label: "Black & White",
    colors: ["Black", "White", "Cream", "Ivory"],
  },
  {
    label: "Grey",
    colors: ["Grey", "Light Grey", "Charcoal", "Silver"],
  },
  {
    label: "Blue",
    colors: ["Navy", "Blue", "Dark Blue", "Cobalt", "Light Blue", "Sky Blue", "Teal"],
  },
  {
    label: "Red",
    colors: ["Red", "Dark Red", "Burgundy", "Coral", "Rust"],
  },
  {
    label: "Pink",
    colors: ["Pink", "Light Pink", "Hot Pink", "Blush", "Mauve"],
  },
  {
    label: "Green",
    colors: ["Green", "Dark Green", "Emerald", "Forest Green", "Olive", "Sage", "Mint", "Light Green"],
  },
  {
    label: "Yellow & Gold",
    colors: ["Yellow", "Mustard", "Gold"],
  },
  {
    label: "Orange",
    colors: ["Orange", "Burnt Orange", "Peach"],
  },
  {
    label: "Purple",
    colors: ["Purple", "Lavender", "Plum", "Lilac"],
  },
  {
    label: "Brown & Tan",
    colors: ["Brown", "Dark Brown", "Light Brown", "Tan", "Camel", "Beige", "Taupe", "Khaki"],
  },
];

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
    <div className="space-y-2.5">
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.colors.map((c) => (
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
        </div>
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
