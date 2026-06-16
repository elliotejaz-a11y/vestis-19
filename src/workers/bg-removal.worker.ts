import { removeBackground } from "@imgly/background-removal";

(self as any).onmessage = async (e: MessageEvent<{ id: string; buffer: ArrayBuffer; mimeType: string }>) => {
  const { id, buffer, mimeType } = e.data;
  try {
    const blob = new Blob([buffer], { type: mimeType || "image/png" });
    const result = await removeBackground(blob);
    const resultBuffer = await result.arrayBuffer();
    (self as any).postMessage({ id, success: true, buffer: resultBuffer }, [resultBuffer]);
  } catch (err) {
    (self as any).postMessage({ id, success: false, error: String(err) });
  }
};
