import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Excalidraw, getSceneVersion, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

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
  // Last scene version we've serialized for save. Excalidraw fires onChange for
  // appState transients (zoom, theme rehydration, font load) too, so a flat
  // "ignore for 800ms" window can't separate phantom changes from real edits —
  // gate saves on getSceneVersion instead.
  const lastSceneVersionRef = useRef<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef<typeof onContentChange>(onContentChange);
  onContentChangeRef.current = onContentChange;

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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const json = serializeAsJSON(elements, appState, files, 'local');
      onContentChangeRef.current?.(json);
    }, 300);
  }, []);

  useEffect(() => {
    initialDataRef.current = null;
    lastSceneVersionRef.current = -1;
  }, [filePath]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Suppress Excalidraw's built-in Ctrl+S "save scene" dialog while still
    // letting the host's document-level keybinding listener run `file.save`.
    // Calling `e.stopPropagation()` here would also call the underlying
    // nativeEvent.stopPropagation() and the host's
    // `document.addEventListener('keydown', resolveKeybinding)` (bubble phase
    // on document) would never fire — meaning Ctrl+S inside the canvas
    // silently did nothing instead of saving the file.
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="h-full w-full" onKeyDownCapture={handleKeyDown}>
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
