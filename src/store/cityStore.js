import { create } from 'zustand';

export const useCityStore = create((set) => ({
  selectedCity: 'douala',
  setCity: (slug) => set({ selectedCity: slug }),
}));
