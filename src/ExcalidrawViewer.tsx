import { useState, useCallback, useRef, useEffect } from 'react';
import { Excalidraw, getSceneVersion, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { getPluginApi } from './pluginApi';
import { clearLatestScene, setLatestScene } from './sceneCache';

interface ExcalidrawInitialData {
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files?: BinaryFiles;
}

interface ExcalidrawViewerProps {
  tab: { path: string; content: string | unknown | null };
  onContentChange?: (content: string) => void;
}

const ExcalidrawViewer = ({ tab, onContentChange }: ExcalidrawViewerProps) => {
  const { content } = tab;
  const filePath = tab.path;
  const [, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const initialDataRef = useRef<ExcalidrawInitialData | null>(null);
  // Last scene version we've serialized. Excalidraw fires onChange for appState
  // transients (zoom, theme rehydration, font load) too, so a flat 800 ms
  // ignore window can't separate phantom changes from real edits — gate on
  // getSceneVersion instead.
  const lastSceneVersionRef = useRef<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef<typeof onContentChange>(onContentChange);
  onContentChangeRef.current = onContentChange;
  const filePathRef = useRef<string>(filePath);
  filePathRef.current = filePath;

  if (!initialDataRef.current && content) {
    try {
      const parsed = JSON.parse(typeof content === 'string' ? content : '');
      initialDataRef.current = {
        elements: parsed.elements || [],
        appState: { ...parsed.appState, collaborators: [] },
        files: parsed.files || undefined,
      };
      lastSceneVersionRef.current = getSceneVersion(initialDataRef.current.elements);
    } catch {
      initialDataRef.current = { elements: [], appState: {} };
      lastSceneVersionRef.current = getSceneVersion([]);
    }
  }

  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    const version = getSceneVersion(elements);
    if (version === lastSceneVersionRef.current) return;
    lastSceneVersionRef.current = version;

    // Serialize and stash in the synchronous cache *now*. The cache is what
    // onSave reads, so the file always reflects the latest scene even when
    // Ctrl+S beats the debounced React state update below.
    const json = serializeAsJSON(elements, appState, files, 'local');
    setLatestScene(filePathRef.current, json);

    // Debounce the host-side dirty/content update — we don't need to spam
    // setOpenTabs on every micro-onChange, only enough to mark the tab dirty
    // and keep tab.content roughly current as a fallback for onSave.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onContentChangeRef.current?.(json);
    }, 300);
  }, []);

  // On filePath change: drop the parsed initial-data + version reset so the
  // next render reparses the new file's content. Cleanup flushes any pending
  // debounce for the *previous* file so it doesn't bleed into the new tab.
  useEffect(() => {
    initialDataRef.current = null;
    lastSceneVersionRef.current = -1;
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [filePath]);

  // Drop the per-tab scene cache when the viewer unmounts entirely so closing
  // a tab without saving doesn't keep stale bytes around.
  useEffect(() => () => clearLatestScene(filePathRef.current), []);

  // Intercept Ctrl+S / Cmd+S in the capture phase on `document`, BEFORE
  // Excalidraw's own native handler runs and pops its "save scene as JSON"
  // file-picker dialog. Excalidraw attaches its keydown listener inside its
  // canvas, so any React onKeyDownCapture on a wrapper fires too late — React
  // synthesizes events from the React root, after native listeners on inner
  // elements have already run.
  //
  // Stopping propagation in capture aborts the descent, so neither
  // Excalidraw's dialog nor the host's bubble-phase listener on document ever
  // sees the event. We compensate by directly invoking the host's `file.save`
  // command via the plugin api captured during init().
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        getPluginApi()?.commands.execute('file.save');
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, []);

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
        initialData={initialDataRef.current}
        onChange={handleChange}
        UIOptions={{ canvasActions: { saveAsImage: false, export: false } }}
      />
    </div>
  );
};

export default ExcalidrawViewer;
