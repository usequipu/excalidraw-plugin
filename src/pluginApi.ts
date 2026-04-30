// Shared singleton holding the host-provided PluginApi. Captured by `init()`
// so the viewer component can dispatch host commands (e.g. `file.save`)
// without having the api threaded through React props.
import type { PluginApi } from './plugin-types';

let _api: PluginApi | null = null;

export function setPluginApi(api: PluginApi): void {
  _api = api;
}

export function getPluginApi(): PluginApi | null {
  return _api;
}
