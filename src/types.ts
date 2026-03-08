/** DataTransfer key for drag-and-drop GIF data */
export const GIF_DATA_KEY = 'application/x-gif-data';

/** Minimal gif data we store in panels (serializable for drag/drop) */
export interface GifData {
  id: string;
  title: string;
  previewUrl: string;
  fullUrl: string;
}

/** Stage size used in both editor and presentation (match visually) */
export const STAGE_WIDTH = 1000;
export const STAGE_HEIGHT = 560;
export const PANEL_WIDTH = 320;
export const PANEL_HEIGHT = 200;
export const STAGE_GAP = 24;
export const TEXT_BLOCK_WIDTH = 400;
export const TEXT_BLOCK_MIN_HEIGHT = 60;

export interface Panel {
  id: string;
  gif: GifData | null;
  /** Position on stage (pixels from top-left) */
  x?: number;
  y?: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextBlock {
  id: string;
  text: string;
  x?: number;
  y?: number;
  textAlign?: TextAlign;
}

export interface Scene {
  id: string;
  panels: Panel[];
  textBlocks: TextBlock[];
}

export function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getDefaultPanelPosition(scene: Scene): { x: number; y: number } {
  if (scene.panels.length === 0) return { x: 0, y: 0 };
  const last = scene.panels[scene.panels.length - 1];
  const x = (last.x ?? 0) + PANEL_WIDTH + STAGE_GAP;
  const y = last.y ?? 0;
  if (x + PANEL_WIDTH > STAGE_WIDTH) {
    return { x: 0, y: (last.y ?? 0) + PANEL_HEIGHT + STAGE_GAP };
  }
  return { x, y };
}

function getDefaultTextPosition(scene: Scene): { x: number; y: number } {
  const allY = [
    ...scene.panels.map((p) => (p.y ?? 0) + PANEL_HEIGHT),
    ...scene.textBlocks.map((t) => (t.y ?? 0) + TEXT_BLOCK_MIN_HEIGHT),
  ];
  const maxY = allY.length ? Math.max(...allY) : 0;
  return { x: 0, y: maxY + STAGE_GAP };
}

export function createPanel(scene?: Scene): Panel {
  const pos = scene ? getDefaultPanelPosition(scene) : { x: 0, y: 0 };
  return { id: createId(), gif: null, x: pos.x, y: pos.y };
}

export function createTextBlock(scene?: Scene): TextBlock {
  const pos = scene ? getDefaultTextPosition(scene) : { x: 0, y: 0 };
  return { id: createId(), text: '', x: pos.x, y: pos.y, textAlign: 'left' };
}

export function createScene(): Scene {
  return {
    id: createId(),
    panels: [],
    textBlocks: [],
  };
}

/** Default position for a panel when x/y are missing (e.g. legacy data) */
export function getPanelDefaultPosition(panelIndex: number): { x: number; y: number } {
  const col = panelIndex % 3;
  const row = Math.floor(panelIndex / 3);
  return {
    x: col * (PANEL_WIDTH + STAGE_GAP),
    y: row * (PANEL_HEIGHT + STAGE_GAP),
  };
}

/** Default position for a text block when x/y are missing */
export function getTextBlockDefaultPosition(
  textIndex: number,
  _scene: Scene
): { x: number; y: number } {
  const panels = _scene.panels.length;
  const bottom = panels
    ? Math.max(..._scene.panels.map((p) => (p.y ?? 0) + PANEL_HEIGHT))
    : 0;
  return { x: 0, y: bottom + STAGE_GAP + textIndex * (TEXT_BLOCK_MIN_HEIGHT + STAGE_GAP) };
}
