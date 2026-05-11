import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@imgly/background-removal", () => ({
  removeBackground: vi.fn(),
}));

import { preloadBgRemovalModel, processClothingImage } from "@/lib/image-processing";
import { removeBackground } from "@imgly/background-removal";

const mockRemoveBackground = vi.mocked(removeBackground);

describe("preloadBgRemovalModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when removeBackground resolves", () => {
    mockRemoveBackground.mockResolvedValue(new Blob());
    expect(() => preloadBgRemovalModel()).not.toThrow();
  });

  it("does not throw when removeBackground rejects", async () => {
    mockRemoveBackground.mockRejectedValue(new Error("network error"));
    expect(() => preloadBgRemovalModel()).not.toThrow();
    // Allow the microtask queue to drain so the rejection is handled silently
    await Promise.resolve();
  });

  it("returns void", () => {
    mockRemoveBackground.mockResolvedValue(new Blob());
    const result = preloadBgRemovalModel();
    expect(result).toBeUndefined();
  });

  it("calls removeBackground with a valid PNG blob", () => {
    mockRemoveBackground.mockResolvedValue(new Blob());
    preloadBgRemovalModel();
    expect(mockRemoveBackground).toHaveBeenCalledOnce();
    const [arg] = mockRemoveBackground.mock.calls[0];
    expect(arg).toBeInstanceOf(Blob);
    expect((arg as Blob).type).toBe("image/png");
  });
});

describe("processClothingImage", () => {
  const mockFile = new File(["data"], "test.png", { type: "image/png" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls removeBackground with the provided file", async () => {
    const mockBlob = new Blob(["processed"], { type: "image/png" });
    mockRemoveBackground.mockResolvedValue(mockBlob);

    await processClothingImage(mockFile);

    expect(mockRemoveBackground).toHaveBeenCalledWith(mockFile);
  });

  it("returns the blob from removeBackground", async () => {
    const mockBlob = new Blob(["processed"], { type: "image/png" });
    mockRemoveBackground.mockResolvedValue(mockBlob);

    const result = await processClothingImage(mockFile);

    expect(result).toBe(mockBlob);
  });

  it("propagates errors from removeBackground", async () => {
    mockRemoveBackground.mockRejectedValue(new Error("removal failed"));

    await expect(processClothingImage(mockFile)).rejects.toThrow("removal failed");
  });
});
