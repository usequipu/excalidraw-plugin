import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
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
  const ignoreChangesRef = useRef<boolean>(true);
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
    } catch {
      initialDataRef.current = { elements: [], appState: {} };
    }
  }

  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    if (ignoreChangesRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const json = serializeAsJSON(elements, appState, files, 'local');
      onContentChangeRef.current?.(json);
    }, 300);
  }, []);

  useEffect(() => {
    initialDataRef.current = null;
    ignoreChangesRef.current = true;
    const timer = setTimeout(() => { ignoreChangesRef.current = false; }, 800);
    return () => clearTimeout(timer);
  }, [filePath]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div className="h-full w-full" onKeyDownCapture={handleKeyDown}>
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
        initialData={initialDataRef.current}
        onChange={handleChange}
        theme="dark"
        UIOptions={{ canvasActions: { saveAsImage: false, export: false } }}
      />
    </div>
  );
};

export default ExcalidrawViewer;
