import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Scene, GifData, TextAlign } from '../types';
import {
  createPanel,
  createTextBlock,
  GIF_DATA_KEY,
  STAGE_WIDTH,
  STAGE_HEIGHT,
  PANEL_WIDTH,
  PANEL_HEIGHT,
  TEXT_BLOCK_WIDTH,
  TEXT_BLOCK_MIN_HEIGHT,
  getPanelDefaultPosition,
  getTextBlockDefaultPosition,
} from '../types';
import './SceneEditor.css';

const SNAP_THRESHOLD = 8;

function parseGifData(dataTransfer: DataTransfer): GifData | null {
  const raw = dataTransfer.getData(GIF_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GifData;
  } catch {
    return null;
  }
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

function getPanelBounds(x: number, y: number): Bounds {
  return {
    left: x,
    top: y,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    right: x + PANEL_WIDTH,
    bottom: y + PANEL_HEIGHT,
    centerX: x + PANEL_WIDTH / 2,
    centerY: y + PANEL_HEIGHT / 2,
  };
}

function getTextBounds(x: number, y: number): Bounds {
  return {
    left: x,
    top: y,
    width: TEXT_BLOCK_WIDTH,
    height: TEXT_BLOCK_MIN_HEIGHT,
    right: x + TEXT_BLOCK_WIDTH,
    bottom: y + TEXT_BLOCK_MIN_HEIGHT,
    centerX: x + TEXT_BLOCK_WIDTH / 2,
    centerY: y + TEXT_BLOCK_MIN_HEIGHT / 2,
  };
}

function snapPosition(
  itemBounds: Bounds,
  others: Bounds[],
  stageW: number,
  stageH: number,
  threshold: number
): { x: number; y: number; guideV: number | null; guideH: number | null } {
  const vGuides: number[] = [0, stageW / 2, stageW];
  const hGuides: number[] = [0, stageH / 2, stageH];
  others.forEach((b) => {
    vGuides.push(b.left, b.centerX, b.right);
    hGuides.push(b.top, b.centerY, b.bottom);
  });

  let x = itemBounds.left;
  let y = itemBounds.top;
  let guideV: number | null = null;
  let guideH: number | null = null;

  const vCandidates = [itemBounds.left, itemBounds.centerX, itemBounds.right] as const;
  let bestVDist = threshold + 1;
  let bestVX = itemBounds.left;
  let bestVGuide: number | null = null;
  for (const guide of vGuides) {
    for (let i = 0; i < vCandidates.length; i++) {
      const d = Math.abs(vCandidates[i] - guide);
      if (d <= threshold && d < bestVDist) {
        bestVDist = d;
        bestVX = itemBounds.left + (guide - vCandidates[i]);
        bestVGuide = guide;
      }
    }
  }
  if (bestVGuide !== null) {
    x = bestVX;
    guideV = bestVGuide;
  }

  const hCandidates = [itemBounds.top, itemBounds.centerY, itemBounds.bottom] as const;
  let bestHDist = threshold + 1;
  let bestHY = itemBounds.top;
  let bestHGuide: number | null = null;
  for (const guide of hGuides) {
    for (let i = 0; i < hCandidates.length; i++) {
      const d = Math.abs(hCandidates[i] - guide);
      if (d <= threshold && d < bestHDist) {
        bestHDist = d;
        bestHY = itemBounds.top + (guide - hCandidates[i]);
        bestHGuide = guide;
      }
    }
  }
  if (bestHGuide !== null) {
    y = bestHY;
    guideH = bestHGuide;
  }

  x = Math.max(0, Math.min(stageW - itemBounds.width, x));
  y = Math.max(0, Math.min(stageH - itemBounds.height, y));
  return { x, y, guideV, guideH };
}

interface SceneEditorProps {
  scene: Scene | null;
  onUpdateScene: (scene: Scene) => void;
}

type DragKind = 'panel' | 'text';

const SceneEditor: React.FC<SceneEditorProps> = ({ scene, onUpdateScene }) => {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    kind: DragKind;
    id: string;
    startMouseX: number;
    startMouseY: number;
    startItemX: number;
    startItemY: number;
  } | null>(null);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{
    vertical: number | null;
    horizontal: number | null;
  }>({ vertical: null, horizontal: null });
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  const getStagePoint = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !scene) return;
      const pt = getStagePoint(e.clientX, e.clientY);
      if (!pt) return;
      const rawX = dragState.startItemX + (pt.x - dragState.startMouseX);
      const rawY = dragState.startItemY + (pt.y - dragState.startMouseY);
      const isPanel = dragState.kind === 'panel';
      const w = isPanel ? PANEL_WIDTH : TEXT_BLOCK_WIDTH;
      const h = isPanel ? PANEL_HEIGHT : TEXT_BLOCK_MIN_HEIGHT;
      const itemBounds: Bounds = {
        left: rawX,
        top: rawY,
        width: w,
        height: h,
        right: rawX + w,
        bottom: rawY + h,
        centerX: rawX + w / 2,
        centerY: rawY + h / 2,
      };
      const others: Bounds[] = [];
      scene.panels.forEach((p, i) => {
        if (dragState.kind === 'panel' && p.id === dragState.id) return;
        const px = p.x ?? getPanelDefaultPosition(i).x;
        const py = p.y ?? getPanelDefaultPosition(i).y;
        others.push(getPanelBounds(px, py));
      });
      scene.textBlocks.forEach((t, i) => {
        if (dragState.kind === 'text' && t.id === dragState.id) return;
        const tx = t.x ?? getTextBlockDefaultPosition(i, scene).x;
        const ty = t.y ?? getTextBlockDefaultPosition(i, scene).y;
        others.push(getTextBounds(tx, ty));
      });
      const snapped = snapPosition(
        itemBounds,
        others,
        STAGE_WIDTH,
        STAGE_HEIGHT,
        SNAP_THRESHOLD
      );
      setLivePos({ x: snapped.x, y: snapped.y });
      setSnapGuides({
        vertical: snapped.guideV,
        horizontal: snapped.guideH,
      });
    },
    [dragState, scene, getStagePoint]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState || !scene) return;
    const pos = livePos ?? {
      x: dragState.startItemX,
      y: dragState.startItemY,
    };
    if (dragState.kind === 'panel') {
      onUpdateScene({
        ...scene,
        panels: scene.panels.map((p) =>
          p.id === dragState.id ? { ...p, x: pos.x, y: pos.y } : p
        ),
      });
    } else {
      onUpdateScene({
        ...scene,
        textBlocks: scene.textBlocks.map((t) =>
          t.id === dragState.id ? { ...t, x: pos.x, y: pos.y } : t
        ),
      });
    }
    setDragState(null);
    setLivePos(null);
    setSnapGuides({ vertical: null, horizontal: null });
  }, [dragState, scene, livePos, onUpdateScene]);

  React.useEffect(() => {
    if (!dragState) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  if (!scene) {
    return (
      <div className="scene-editor scene-editor-empty">
        <p>Add a scene from the sidebar to get started.</p>
      </div>
    );
  }

  const addPanel = () => {
    onUpdateScene({
      ...scene,
      panels: [...scene.panels, createPanel(scene)],
    });
  };

  const addTextBlock = () => {
    onUpdateScene({
      ...scene,
      textBlocks: [...scene.textBlocks, createTextBlock(scene)],
    });
  };

  const removePanel = (panelId: string) => {
    onUpdateScene({
      ...scene,
      panels: scene.panels.filter((p) => p.id !== panelId),
    });
  };

  const removeTextBlock = (blockId: string) => {
    onUpdateScene({
      ...scene,
      textBlocks: scene.textBlocks.filter((t) => t.id !== blockId),
    });
  };

  const setPanelGif = (panelId: string, gif: GifData | null) => {
    onUpdateScene({
      ...scene,
      panels: scene.panels.map((p) =>
        p.id === panelId ? { ...p, gif } : p
      ),
    });
  };

  const setTextBlockContent = (blockId: string, text: string) => {
    onUpdateScene({
      ...scene,
      textBlocks: scene.textBlocks.map((t) =>
        t.id === blockId ? { ...t, text } : t
      ),
    });
  };

  const setTextBlockAlign = (blockId: string, textAlign: TextAlign) => {
    onUpdateScene({
      ...scene,
      textBlocks: scene.textBlocks.map((t) =>
        t.id === blockId ? { ...t, textAlign } : t
      ),
    });
  };

  useEffect(() => {
    const wrap = stageWrapRef.current;
    if (!wrap) return;
    const updateScale = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w > 0 && h > 0) {
        const scale = Math.min(1, w / STAGE_WIDTH, h / STAGE_HEIGHT);
        setStageScale(scale);
      }
    };
    const ro = new ResizeObserver(updateScale);
    ro.observe(wrap);
    updateScale();
    return () => ro.disconnect();
  }, [scene?.id]);

  const startDrag = (kind: DragKind, id: string, itemX: number, itemY: number, clientX: number, clientY: number) => {
    const pt = getStagePoint(clientX, clientY);
    if (!pt) return;
    setDragState({
      kind,
      id,
      startMouseX: pt.x,
      startMouseY: pt.y,
      startItemX: itemX,
      startItemY: itemY,
    });
    setLivePos({ x: itemX, y: itemY });
  };

  const handleDrop = (e: React.DragEvent, panelId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('panel-drag-over');
    const gif = parseGifData(e.dataTransfer);
    if (gif) setPanelGif(panelId, gif);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('panel-drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('panel-drag-over');
  };

  return (
    <div className="scene-editor">
      <div className="scene-toolbar">
        <button type="button" className="scene-toolbar-btn" onClick={addPanel}>
          Add panel
        </button>
        <button type="button" className="scene-toolbar-btn" onClick={addTextBlock}>
          Add text
        </button>
      </div>

      <div ref={stageWrapRef} className="scene-stage-wrap">
        <div
          className="scene-stage-scaled"
          style={{
            width: STAGE_WIDTH * stageScale,
            height: STAGE_HEIGHT * stageScale,
          }}
        >
          <div
            ref={stageRef}
            className="scene-stage"
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              transform: `scale(${stageScale})`,
              transformOrigin: 'top left',
            }}
          >
          {snapGuides.vertical !== null && (
            <div
              className="scene-guide scene-guide-vertical"
              style={{ left: snapGuides.vertical }}
            />
          )}
          {snapGuides.horizontal !== null && (
            <div
              className="scene-guide scene-guide-horizontal"
              style={{ top: snapGuides.horizontal }}
            />
          )}

          {scene.panels.map((panel, i) => {
            const defaultPos = getPanelDefaultPosition(i);
            const x = panel.x ?? defaultPos.x;
            const y = panel.y ?? defaultPos.y;
            const isDragging = dragState?.kind === 'panel' && dragState.id === panel.id;
            const displayX = isDragging && livePos ? livePos.x : x;
            const displayY = isDragging && livePos ? livePos.y : y;
            return (
              <div
                key={panel.id}
                className="panel"
                style={{
                  left: displayX,
                  top: displayY,
                  width: PANEL_WIDTH,
                  height: PANEL_HEIGHT,
                }}
                onDrop={(e) => handleDrop(e, panel.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <button
                  type="button"
                  className="panel-drag-handle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startDrag('panel', panel.id, x, y, e.clientX, e.clientY);
                  }}
                  aria-label="Drag to move"
                  title="Drag to move"
                >
                  ⋮⋮
                </button>
                <button
                  type="button"
                  className="panel-remove panel-remove-whole"
                  onClick={() => removePanel(panel.id)}
                  aria-label="Remove panel"
                  title="Remove panel"
                >
                  ⊗
                </button>
                {panel.gif ? (
                  <>
                    <img
                      src={panel.gif.fullUrl}
                      alt={panel.gif.title || 'GIF'}
                      className="panel-gif"
                    />
                    <button
                      type="button"
                      className="panel-remove"
                      onClick={() => setPanelGif(panel.id, null)}
                      aria-label="Clear GIF"
                      title="Clear GIF"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="panel-placeholder">Drop a GIF here</span>
                )}
              </div>
            );
          })}

          {scene.textBlocks.map((block, i) => {
            const defaultPos = getTextBlockDefaultPosition(i, scene);
            const x = block.x ?? defaultPos.x;
            const y = block.y ?? defaultPos.y;
            const isDragging = dragState?.kind === 'text' && dragState.id === block.id;
            const displayX = isDragging && livePos ? livePos.x : x;
            const displayY = isDragging && livePos ? livePos.y : y;
            return (
              <div
                key={block.id}
                className="text-block-wrap text-block-on-stage"
                style={{
                  left: displayX,
                  top: displayY,
                  width: TEXT_BLOCK_WIDTH,
                }}
              >
                <button
                  type="button"
                  className="text-block-drag-handle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startDrag('text', block.id, x, y, e.clientX, e.clientY);
                  }}
                  aria-label="Drag to move"
                  title="Drag to move"
                >
                  ⋮⋮
                </button>
                {editingTextId === block.id ? (
                  <>
                    <div className="text-block-align-bar">
                      <button
                        type="button"
                        className={`text-block-align-btn ${(block.textAlign ?? 'left') === 'left' ? 'active' : ''}`}
                        onClick={() => setTextBlockAlign(block.id, 'left')}
                        title="Align left"
                        aria-label="Align left"
                      >
                        L
                      </button>
                      <button
                        type="button"
                        className={`text-block-align-btn ${(block.textAlign ?? 'left') === 'center' ? 'active' : ''}`}
                        onClick={() => setTextBlockAlign(block.id, 'center')}
                        title="Align center"
                        aria-label="Align center"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        className={`text-block-align-btn ${(block.textAlign ?? 'left') === 'right' ? 'active' : ''}`}
                        onClick={() => setTextBlockAlign(block.id, 'right')}
                        title="Align right"
                        aria-label="Align right"
                      >
                        R
                      </button>
                    </div>
                    <textarea
                      className="text-block-input"
                      value={block.text}
                      onChange={(e) => setTextBlockContent(block.id, e.target.value)}
                      onBlur={() => setEditingTextId(null)}
                      autoFocus
                      placeholder="Type something…"
                      style={{ textAlign: block.textAlign ?? 'left' }}
                    />
                  </>
                ) : (
                  <div
                    className="text-block"
                    onClick={() => setEditingTextId(block.id)}
                    style={{ textAlign: block.textAlign ?? 'left' }}
                  >
                    {block.text || 'Click to add text'}
                  </div>
                )}
                <button
                  type="button"
                  className="text-block-remove"
                  onClick={() => removeTextBlock(block.id)}
                  aria-label="Remove text"
                >
                  ×
                </button>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneEditor;
