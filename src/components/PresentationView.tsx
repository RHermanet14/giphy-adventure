import React, { useEffect, useCallback, useRef, useState } from 'react';
import type { Scene } from '../types';
import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  PANEL_WIDTH,
  PANEL_HEIGHT,
  TEXT_BLOCK_WIDTH,
  TEXT_BLOCK_MIN_HEIGHT,
  getPanelDefaultPosition,
  getTextBlockDefaultPosition,
} from '../types';
import './PresentationView.css';

interface PresentationViewProps {
  scenes: Scene[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onJumpToScene: (index: number) => void;
}

const PresentationView: React.FC<PresentationViewProps> = ({
  scenes,
  currentIndex,
  onPrev,
  onNext,
  onExit,
  onJumpToScene,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scene = scenes[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < scenes.length - 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const s = Math.min(1, w / STAGE_WIDTH, h / STAGE_HEIGHT);
        setScale(s);
      }
    };
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    updateScale();
    return () => ro.disconnect();
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      if (e.key === 'ArrowLeft' && canPrev) onPrev();
      if (e.key === 'ArrowRight' && canNext) onNext();
    },
    [onExit, onPrev, onNext, canPrev, canNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!scene) {
    return (
      <div className="presentation-view">
        <p>No scenes.</p>
        <button type="button" className="presentation-exit" onClick={onExit}>
          Exit
        </button>
      </div>
    );
  }

  return (
    <div className="presentation-view">
      <button
        type="button"
        className="presentation-exit"
        onClick={onExit}
        aria-label="Exit presentation"
      >
        Exit
      </button>

      {canPrev && (
        <button
          type="button"
          className="presentation-nav presentation-prev"
          onClick={onPrev}
          aria-label="Previous scene"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          type="button"
          className="presentation-nav presentation-next"
          onClick={onNext}
          aria-label="Next scene"
        >
          ›
        </button>
      )}

      <div ref={containerRef} className="presentation-scene-wrap">
        <div
          className="presentation-scene"
          style={{
            width: STAGE_WIDTH * scale,
            height: STAGE_HEIGHT * scale,
          }}
        >
          <div
            className="presentation-scene-inner"
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundImage: scene.backgroundImage ? `url(${scene.backgroundImage})` : undefined,
              backgroundSize: scene.backgroundImage ? 'cover' : undefined,
              backgroundPosition: scene.backgroundImage ? 'center' : undefined,
              backgroundRepeat: scene.backgroundImage ? 'no-repeat' : undefined,
            }}
          >
        {scene.panels.map((panel, i) => {
          const defaultPos = getPanelDefaultPosition(i);
          const x = panel.x ?? defaultPos.x;
          const y = panel.y ?? defaultPos.y;
          const width = panel.width ?? PANEL_WIDTH;
          const height = panel.height ?? PANEL_HEIGHT;
          if (!panel.gif) return null;
          const targetIndex =
            panel.targetSceneId != null
              ? scenes.findIndex((s) => s.id === panel.targetSceneId)
              : -1;
          const clickable = targetIndex >= 0;
          return (
            <div
              key={panel.id}
              className={
                'presentation-panel' +
                (clickable ? ' presentation-panel-clickable' : '')
              }
              style={{
                left: x,
                top: y,
                width,
                height,
              }}
              onClick={
                clickable ? () => onJumpToScene(targetIndex) : undefined
              }
            >
              <img
                src={panel.gif.fullUrl}
                alt={panel.gif.title || 'GIF'}
                className="presentation-panel-gif"
              />
            </div>
          );
        })}
        {scene.textBlocks.map(
          (block, i) => {
            const defaultPos = getTextBlockDefaultPosition(i, scene);
            const x = block.x ?? defaultPos.x;
            const y = block.y ?? defaultPos.y;
            const width = block.width ?? TEXT_BLOCK_WIDTH;
            const height = block.height ?? TEXT_BLOCK_MIN_HEIGHT;
            if (!block.text) return null;
            return (
              <div
                key={block.id}
                className="presentation-text"
                style={{
                  left: x,
                  top: y,
                  width,
                  height,
                  textAlign: block.textAlign ?? 'left',
                  fontFamily: block.fontFamily ?? 'system-ui, -apple-system, sans-serif',
                  fontSize: `${block.fontSize ?? 20}px`,
                  color: block.color ?? '#f1f5f9',
                }}
              >
                {block.text}
              </div>
            );
          }
        )}
          </div>
        </div>
      </div>

      <div className="presentation-footer">
        {currentIndex + 1} / {scenes.length}
      </div>
    </div>
  );
};

export default PresentationView;
