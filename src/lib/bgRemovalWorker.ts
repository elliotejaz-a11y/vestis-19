type Handlers = [(blob: Blob) => void, (err: Error) => void];

// A pool (not a single worker) so concurrently-processed items actually run
// background removal in parallel instead of queuing on one worker thread.
const POOL_SIZE = 3;
const workers: Worker[] = [];
const workerPending = new Map<Worker, Set<string>>();
const pending = new Map<string, Handlers>();
let nextWorker = 0;

function createWorker(): Worker {
  const worker = new Worker(
    new URL("../workers/bg-removal.worker.ts", import.meta.url),
    { type: "module" }
  );
  workerPending.set(worker, new Set());
  worker.onmessage = (e: MessageEvent) => {
    const { id, success, buffer, error } = e.data;
    workerPending.get(worker)?.delete(id);
    const handlers = pending.get(id);
    if (!handlers) return;
    pending.delete(id);
    if (success) {
      handlers[0](new Blob([buffer], { type: "image/png" }));
    } else {
      handlers[1](new Error(error || "Background removal failed"));
    }
  };
  worker.onerror = (e) => {
    console.error("[BgRemovalWorker]", e.message);
    const ids = workerPending.get(worker);
    if (ids) {
      for (const id of ids) {
        pending.get(id)?.[1](new Error(e.message || "Background removal worker crashed"));
        pending.delete(id);
      }
      ids.clear();
    }
  };
  return worker;
}

function getWorker(): Worker {
  if (workers.length < POOL_SIZE) {
    const worker = createWorker();
    workers.push(worker);
    return worker;
  }
  const worker = workers[nextWorker % workers.length];
  nextWorker++;
  return worker;
}

export async function removeBackgroundInWorker(blob: Blob): Promise<Blob> {
  const id = crypto.randomUUID();
  const buffer = await blob.arrayBuffer();
  const worker = getWorker();
  return new Promise((resolve, reject) => {
    pending.set(id, [resolve, reject]);
    workerPending.get(worker)!.add(id);
    worker.postMessage({ id, buffer, mimeType: blob.type || "image/png" }, [buffer]);
  });
}
