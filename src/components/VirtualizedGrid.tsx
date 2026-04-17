import { memo } from "react";

interface VirtualizedGridProps<T> {
  items: T[];
  columns?: number;
  gap?: number;
  estimateRowHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

/**
 * Simple, robust grid that uses native CSS grid + the browser's built-in
 * `content-visibility: auto` for off-screen virtualization. This avoids
 * the misalignment / overlap glitches that absolute-positioned virtualizers
 * cause once row heights vary (e.g. wrapping titles, different image aspect
 * ratios, or LazyImage placeholders settling).
 *
 * Performance is more than enough for hundreds of items because rows that are
 * off-screen are skipped during layout/paint by the browser.
 */
function VirtualizedGridInner<T>({
  items,
  columns = 2,
  gap = 12,
  estimateRowHeight = 280,
  renderItem,
  className,
}: VirtualizedGridProps<T>) {
  return (
    <div className={className}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          alignItems: "start",
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: `${estimateRowHeight}px`,
            } as React.CSSProperties}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualizedGrid = memo(VirtualizedGridInner) as typeof VirtualizedGridInner;
