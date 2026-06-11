import { create } from 'zustand';
import { graphApi } from '../api/graph.api';

export const useGraphStore = create((set, get) => ({
  graphs: { douala: null, yaounde: null },
  lastUpdated: { douala: null, yaounde: null },
  loading: false,
  error: null,

  loadGraph: async (city) => {
    set({ loading: true, error: null });
    try {
      const data = await graphApi.getGraph(city);
      set(state => ({
        graphs: { ...state.graphs, [city]: data },
        lastUpdated: { ...state.lastUpdated, [city]: Date.now() },
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  refreshGraph: (city) => {
    // Force le rechargement (appelé après approbation d'un trajet)
    set(state => ({ graphs: { ...state.graphs, [city]: null } }));
    get().loadGraph(city);
  },

  getGraph: (city) => get().graphs[city],
}));
