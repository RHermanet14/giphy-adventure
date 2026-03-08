import React, { useState, useCallback, useEffect } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import type { GifData } from '../types';
import { GIF_DATA_KEY } from '../types';
import './GifSearchPanel.css';

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY ?? '');

/** Giphy API image set (subset we need) */
interface GiphyImages {
  fixed_height_small?: { url: string };
  fixed_height?: { url: string };
  downsized_medium?: { url: string };
  downsized?: { url: string };
}

interface GiphyGif {
  id: string;
  title: string;
  images: GiphyImages;
}

function toGifData(g: GiphyGif): GifData {
  const preview =
    g.images.fixed_height_small?.url ||
    g.images.fixed_height?.url ||
    g.images.downsized?.url ||
    '';
  const full =
    g.images.downsized_medium?.url ||
    g.images.fixed_height?.url ||
    g.images.downsized?.url ||
    preview;
  return {
    id: g.id,
    title: g.title || '',
    previewUrl: preview,
    fullUrl: full,
  };
}

const GifSearchPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (offset: number) => {
    const result = searchTerm
      ? await gf.search(searchTerm, { offset, limit: 15 })
      : await gf.trending({ offset, limit: 15 });
    return result.data as GiphyGif[];
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGifs(0).then((data) => {
      if (!cancelled) {
        setGifs(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [fetchGifs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  const handleDragStart = (e: React.DragEvent, gif: GifData) => {
    e.dataTransfer.setData(GIF_DATA_KEY, JSON.stringify(gif));
    e.dataTransfer.effectAllowed = 'copy';
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
      const img = e.currentTarget.querySelector('img');
      if (img) {
        e.dataTransfer.setDragImage(img, 40, 40);
      }
    }
  };

  return (
    <div className={`gif-search-panel ${collapsed ? 'gif-search-panel-collapsed' : ''}`}>
      <button
        type="button"
        className="gif-search-panel-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand GIF search' : 'Collapse GIF search'}
      >
        <span className="gif-search-panel-title">Search GIFs</span>
        <span className="gif-search-panel-chevron" aria-hidden>
          {collapsed ? '›' : '‹'}
        </span>
      </button>
      {!collapsed && (
        <>
          <form onSubmit={handleSubmit} className="gif-search-form">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="gif-search-input"
              aria-label="Search GIFs"
            />
          </form>
          <div className="gif-search-results">
            {loading ? (
              <p className="gif-search-muted">Loading…</p>
            ) : (
              gifs.map((g) => {
                const data = toGifData(g);
                return (
                  <div
                    key={g.id}
                    className="gif-search-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, data)}
                  >
                    <img
                      src={data.previewUrl}
                      alt={data.title || 'GIF'}
                      className="gif-search-item-img"
                    />
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GifSearchPanel;
