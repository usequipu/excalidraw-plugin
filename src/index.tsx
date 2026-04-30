import './setAssetPath';
import type { PluginApi } from './plugin-types';
import { setPluginApi } from './pluginApi';
import { getLatestScene } from './sceneCache';
import ExcalidrawViewer from './ExcalidrawViewer';

export function init(api: PluginApi): void {
  setPluginApi(api);
  api.register({
    id: 'excalidraw-plugin',
    canHandle: (_tab, activeFile) => (activeFile?.name ?? '').endsWith('.excalidraw'),
    priority: 10,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ExcalidrawViewer as any,
    onSave: async (tab) => {
      // Prefer the synchronously-maintained cache: React's state update from
      // onContentChange may not have flushed by the time the host calls
      // onSave (e.g. Ctrl+S immediately after an edit), so tab.content can
      // be stale. The cache is updated inside handleChange before any
      // React batching kicks in.
      const cached = getLatestScene(tab.path);
      if (typeof cached === 'string') return cached;
      return typeof tab.content === 'string' ? tab.content : null;
    },
  });
}
