import { useState, useCallback, useEffect } from 'react';
import type { Scene } from './types';
import { createScene } from './types';
import Sidebar from './components/Sidebar';
import SceneEditor from './components/SceneEditor';
import GifSearchPanel from './components/GifSearchPanel';
import PresentationView from './components/PresentationView';
import './App.css';

const MAX_HISTORY = 50;
const initialScenes = [createScene()];

function App() {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(
    initialScenes[0]?.id ?? null
  );
  const [history, setHistory] = useState<Scene[][]>(() => [initialScenes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);

  const currentScene = scenes.find((s) => s.id === currentSceneId) ?? null;

  // If current scene was removed (e.g. after undo), select first scene
  useEffect(() => {
    if (scenes.length > 0 && !currentScene) {
      setCurrentSceneId(scenes[0].id);
    }
  }, [scenes, currentScene]);

  const setScenesAndHistory = useCallback((nextScenes: Scene[]) => {
    setScenes(nextScenes);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, nextScenes].slice(-MAX_HISTORY);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const handleUpdateScene = useCallback(
    (updated: Scene) => {
      const next = scenes.map((s) => (s.id === updated.id ? updated : s));
      setScenesAndHistory(next);
    },
    [scenes, setScenesAndHistory]
  );

  const handleAddScene = useCallback(() => {
    const newScene = createScene();
    const next = [...scenes, newScene];
    setScenesAndHistory(next);
    setCurrentSceneId(newScene.id);
  }, [scenes, setScenesAndHistory]);

  const handleSelectScene = useCallback((id: string) => {
    setCurrentSceneId(id);
  }, []);

  const handlePresent = useCallback(() => {
    const idx = Math.max(
      0,
      scenes.findIndex((s) => s.id === currentSceneId)
    );
    setPresentationIndex(idx);
    setIsPresentationMode(true);
  }, [scenes, currentSceneId]);

  const handlePresentationPrev = useCallback(() => {
    setPresentationIndex((i) => Math.max(0, i - 1));
  }, []);

  const handlePresentationNext = useCallback(() => {
    setPresentationIndex((i) => Math.min(scenes.length - 1, i + 1));
  }, [scenes.length]);

  const handlePresentationExit = useCallback(() => {
    setIsPresentationMode(false);
    const scene = scenes[presentationIndex];
    if (scene) setCurrentSceneId(scene.id);
  }, [scenes, presentationIndex]);

  const handlePresentationJump = useCallback(
    (index: number) => {
      if (index < 0 || index >= scenes.length) return;
      setPresentationIndex(index);
    },
    [scenes.length],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = historyIndex - 1;
    setHistoryIndex(prev);
    setScenes(history[prev]);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setScenes(history[next]);
  }, [history, historyIndex]);

  if (isPresentationMode) {
    return (
      <PresentationView
        scenes={scenes}
        currentIndex={presentationIndex}
        onPrev={handlePresentationPrev}
        onNext={handlePresentationNext}
        onExit={handlePresentationExit}
        onJumpToScene={handlePresentationJump}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        scenes={scenes}
        currentSceneId={currentSceneId}
        onSelectScene={handleSelectScene}
        onAddScene={handleAddScene}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPresent={handlePresent}
        canUndo={historyIndex > 0}
        canRedo={historyIndex >= 0 && historyIndex < history.length - 1}
      />
      <div className="app-main">
        <SceneEditor
          scene={currentScene}
          allScenes={scenes}
          onUpdateScene={handleUpdateScene}
        />
      </div>
      <GifSearchPanel />
    </div>
  );
}

export default App;
