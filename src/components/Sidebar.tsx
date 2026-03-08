import React, { useState } from 'react';
import type { Scene } from '../types';
import './Sidebar.css';

interface SidebarProps {
  scenes: Scene[];
  currentSceneId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPresent: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  scenes,
  currentSceneId,
  onSelectScene,
  onAddScene,
  onUndo,
  onRedo,
  onPresent,
  canUndo,
  canRedo,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="sidebar-toggle-label">Scenes</span>
        <span className="sidebar-toggle-chevron" aria-hidden>
          {collapsed ? '›' : '‹'}
        </span>
      </button>
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <button
              type="button"
              className="sidebar-btn sidebar-btn-add"
              onClick={onAddScene}
              aria-label="Add scene"
              title="Add scene"
            >
              +
            </button>
            <div className="sidebar-divider" />
            <button
              type="button"
              className="sidebar-btn"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title="Undo"
            >
              ↶
            </button>
            <button
              type="button"
              className="sidebar-btn"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title="Redo"
            >
              ↷
            </button>
            <div className="sidebar-divider" />
            <button
              type="button"
              className="sidebar-btn"
              onClick={onPresent}
              aria-label="Present"
              title="Presentation mode"
            >
              ⛶
            </button>
          </div>
          <div className="scene-list">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`scene-item ${currentSceneId === scene.id ? 'scene-item-active' : ''}`}
                onClick={() => onSelectScene(scene.id)}
              >
                <span className="scene-number">{index + 1}</span>
                <div className="scene-thumb">
                  {scene.panels[0]?.gif ? (
                    <img
                      src={scene.panels[0].gif.previewUrl}
                      alt=""
                      className="scene-thumb-img"
                    />
                  ) : (
                    <div className="scene-thumb-placeholder" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {scenes.length > 0 && (
            <div className="sidebar-selection-line" aria-hidden />
          )}
        </>
      )}
    </aside>
  );
};

export default Sidebar;
