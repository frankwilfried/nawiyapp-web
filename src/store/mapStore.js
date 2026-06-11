import { create } from 'zustand';

export const useMapStore = create((set) => ({
  userPosition: null,
  mapCenter: { lat: 4.0511, lng: 9.7085 }, // Akwa, Douala par défaut
  zoom: 13,
  isFollowingUser: true,

  setUserPosition: (coords) => set(state => ({
    userPosition: coords,
    mapCenter: state.isFollowingUser ? coords : state.mapCenter,
  })),

  setMapCenter: (coords) => set({ mapCenter: coords }),
  stopFollowingUser: () => set({ isFollowingUser: false }),
  startFollowingUser: () => set({ isFollowingUser: true }),
}));
