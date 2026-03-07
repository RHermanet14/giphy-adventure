import { useState, useCallback } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import type { GifsResult } from '@giphy/js-fetch-api';

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY ?? '');

const GiphySearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  const fetchGifs = useCallback(
    (offset: number): Promise<GifsResult> => {
      if (!searchTerm) return gf.trending({ offset, limit: 12 });
      return gf.search(searchTerm, { offset, limit: 12 });
    },
    [searchTerm]
  );

  return (
    <div className="giphy-search">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="search-input"
          autoFocus
          aria-label="Search GIFs"
        />
      </form>
      <div className="grid-wrapper" key={searchTerm || 'trending'}>
        <Grid
          width={900}
          columns={3}
          gutter={8}
          fetchGifs={fetchGifs}
        />
      </div>
    </div>
  );
};

export default GiphySearch;
