import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClothingCard } from "./ClothingCard";
import type { ClothingItem } from "@/types/wardrobe";

// LazyImage uses IntersectionObserver — stub it
vi.mock("./LazyImage", () => ({
  LazyImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// DeleteConfirmDialog — stub so we control the confirm button
vi.mock("./DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (o: boolean) => void;
  }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm}>Confirm delete</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null,
}));

function makeItem(overrides: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id: "item-1",
    name: "Black Tee",
    category: "tops",
    color: "black",
    fabric: "cotton",
    imageUrl: "https://example.com/tee.jpg",
    tags: [],
    notes: "",
    addedAt: new Date(),
    imageStatus: "ready",
    ...overrides,
  };
}

describe("ClothingCard", () => {
  it("renders item name and category/colour metadata", () => {
    render(<ClothingCard item={makeItem()} />);
    expect(screen.getByText("Black Tee")).toBeTruthy();
    expect(screen.getByText(/tops.*black/i)).toBeTruthy();
  });

  it("calls onDetail when card image area is clicked", () => {
    const onDetail = vi.fn();
    render(<ClothingCard item={makeItem()} onDetail={onDetail} />);
    fireEvent.click(screen.getByRole("button", { name: /black tee/i }));
    expect(onDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }));
  });

  it("shows delete dialog when X button is clicked, then calls onRemove on confirm", () => {
    const onRemove = vi.fn();
    const { container } = render(<ClothingCard item={makeItem()} onRemove={onRemove} />);

    // The X button is in the overlay — click it
    const xBtn = container.querySelector("button.w-6.h-6:last-child") as HTMLButtonElement;
    fireEvent.click(xBtn);

    expect(screen.getByTestId("delete-dialog")).toBeTruthy();
    fireEvent.click(screen.getByText("Confirm delete"));
    expect(onRemove).toHaveBeenCalledWith("item-1");
  });

  it("shows processing spinner when imageStatus is processing", () => {
    render(<ClothingCard item={makeItem({ imageStatus: "processing" })} />);
    expect(screen.getByText(/removing background/i)).toBeTruthy();
  });

  it("shows retry banner when imageStatus is failed and onRetryBackgroundRemoval is provided", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ClothingCard
        item={makeItem({ imageStatus: "failed" })}
        onRetryBackgroundRemoval={onRetry}
      />
    );
    // The outer card button's accessible name includes nested text — query by DOM path
    // to target only the retry button inside the failed banner, not the outer wrapper.
    const retryBtn = container.querySelector(".absolute.inset-x-0.bottom-0 button") as HTMLButtonElement;
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith("item-1");
  });

  it("does not render delete button when onRemove is not provided", () => {
    const { container } = render(<ClothingCard item={makeItem()} />);
    // Only onDetail button (Info icon) should appear — no X button
    const overlayButtons = container.querySelectorAll(
      ".absolute.top-2.right-2 button"
    );
    expect(overlayButtons.length).toBe(0); // no remove, no retry (status=ready, no handler)
  });
});
