// Per-tab scene cache. Updated synchronously by ExcalidrawViewer.handleChange
// so the extension's onSave hook always returns the latest serialized scene
// regardless of where Excalidraw's onChange landed in React's batching cycle.
//
// Without this, Ctrl+S could fire before the debounced React state update
// reached the host's `tab.content`, causing onSave to return stale JSON and
// the host to overwrite the file with the previously-saved content.
const cache = new Map<string, string>();

export function setLatestScene(filePath: string, json: string): void {
  cache.set(filePath, json);
}

export function getLatestScene(filePath: string): string | undefined {
  return cache.get(filePath);
}

export function clearLatestScene(filePath: string): void {
  cache.delete(filePath);
}
