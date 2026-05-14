import { useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedGridProps<T extends { id: string }> {
  items: T[];
  columns?: number;
  gap?: number;
  estimateRowHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

function VirtualizedGridInner<T extends { id: string }>({
  items,
  columns = 2,
  gap = 12,
  estimateRowHeight = 240,
  renderItem,
  className,
  overscan = 3,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  // For small lists, render directly without virtualization
  if (items.length <= 20) {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, i) => (
            <div key={item.id}>{renderItem(item, i)}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className={className} style={{ height: "calc(100vh - 280px)", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * columns;
          const rowItems = items.slice(rowStart, rowStart + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {rowItems.map((item, colIndex) => (
                  <div key={item.id}>
                    {renderItem(item, rowStart + colIndex)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualizedGrid = memo(VirtualizedGridInner) as typeof VirtualizedGridInner;
