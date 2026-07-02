type Handlers = [(blob: Blob) => void, (err: Error) => void];

// A small pool (not a single worker) so concurrently-processed items run
// background removal in parallel instead of queuing on one worker thread.
// Kept modest — each worker holds its own ONNX/WASM session, and running too
// many at once increases the odds of a worker crashing under memory pressure.
const POOL_SIZE = 2;
const TIMEOUT_MS = 30000;
const workers: Worker[] = [];
const workerPending = new Map<Worker, Set<string>>();
const pending = new Map<string, Handlers>();
let nextWorker = 0;

function removeFromPool(worker: Worker) {
  const idx = workers.indexOf(worker);
  if (idx !== -1) workers.splice(idx, 1);
  workerPending.delete(worker);
  worker.terminate();
}

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
    }
    // Drop the crashed worker from the pool so it isn't reused — a fresh one
    // is created the next time this slot is needed.
    removeFromPool(worker);
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
    // Guards against a worker that silently stops responding (e.g. a fatal
    // WASM trap that doesn't surface as an `error` event) so a single stuck
    // item can never hang the queue forever.
    const timer = setTimeout(() => {
      pending.delete(id);
      workerPending.get(worker)?.delete(id);
      reject(new Error("Background removal timed out"));
    }, TIMEOUT_MS);
    pending.set(id, [
      (result) => { clearTimeout(timer); resolve(result); },
      (err) => { clearTimeout(timer); reject(err); },
    ]);
    workerPending.get(worker)!.add(id);
    worker.postMessage({ id, buffer, mimeType: blob.type || "image/png" }, [buffer]);
  });
}
