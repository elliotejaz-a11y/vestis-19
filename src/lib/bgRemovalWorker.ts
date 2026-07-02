type Handlers = [(blob: Blob) => void, (err: Error) => void];

let workerInstance: Worker | null = null;
const pending = new Map<string, Handlers>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL("../workers/bg-removal.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerInstance.onmessage = (e: MessageEvent) => {
      const { id, success, buffer, error } = e.data;
      const handlers = pending.get(id);
      if (!handlers) return;
      pending.delete(id);
      if (success) {
        handlers[0](new Blob([buffer], { type: "image/png" }));
      } else {
        handlers[1](new Error(error || "Background removal failed"));
      }
    };
    workerInstance.onerror = (e) => {
      console.error("[BgRemovalWorker]", e.message);
      for (const [, reject] of pending.values()) {
        reject(new Error(e.message || "Background removal worker crashed"));
      }
      pending.clear();
    };
  }
  return workerInstance;
}

export async function removeBackgroundInWorker(blob: Blob): Promise<Blob> {
  const id = crypto.randomUUID();
  const buffer = await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    pending.set(id, [resolve, reject]);
    getWorker().postMessage({ id, buffer, mimeType: blob.type || "image/png" }, [buffer]);
  });
}
