import './setAssetPath';
import type { PluginApi } from './plugin-types';
import ExcalidrawViewer from './ExcalidrawViewer';

export function init(api: PluginApi): void {
  api.register({
    id: 'excalidraw-plugin',
    canHandle: (_tab, activeFile) => (activeFile?.name ?? '').endsWith('.excalidraw'),
    priority: 10,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ExcalidrawViewer as any,
    onSave: async (tab) => (typeof tab.content === 'string' ? tab.content : null),
  });
}
