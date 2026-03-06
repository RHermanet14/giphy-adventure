import { useState, useEffect } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Gif, Grid } from '@giphy/react-components';
import type { IGif } from "@giphy/js-types";

// Initialize GiphyFetch with your API key
const gf = new GiphyFetch(process.env.REACT_APP_GIPHY_API_KEY as string);

const GiphySearch: React.FC = () => {
  const [gifs, setGifs] = useState<IGif[]>([]);

  useEffect(() => {
    const fetchGifs = async () => {
      try {
        // Fetch trending GIFs as an initial set
        const trendingGifs = await gf.trending({ limit: 10 });
        setGifs(trendingGifs.data);
      } catch (error) {
        console.error("Error fetching GIFs:", error);
      }
    };
    fetchGifs();
  }, []);

  // An example of a function to fetch GIFs for the <Grid> component
  const fetchGifsForGrid = (offset: number) => gf.trending({ offset, limit: 10 });

  return (
    <div>
      <h1>GIPHY Integration</h1>
      {/* Example 1: Displaying individual fetched Gifs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {gifs.map((gif) => (
          <Gif gif={gif} width={200} key={gif.id} />
        ))}
      </div>

      {/* Example 2: Using the pre-built Grid component */}
      <h2>Trending Grid</h2>
      {/* The Grid component handles fetching and display internally */}
      <Grid
        width={800}
        columns={3}
        gutter={6}
        fetchGifs={fetchGifsForGrid}
      />
    </div>
  );
};

export default GiphySearch;
