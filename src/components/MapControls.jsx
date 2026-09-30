import { useMapStore } from '../store/mapStore';
import Icon from './Icon';

// Bouton « ma position » façon Google Maps — les accès chauffeur passent par l'onglet Chauffeur
export default function MapControls({ mapRef, userPosition, onNoPosition }) {
  const { startFollowingUser, isFollowingUser } = useMapStore();

  const handleLocate = () => {
    if (!userPosition) { onNoPosition?.(); return; }
    startFollowingUser();
    mapRef.current?.easeTo({ center: [userPosition.lng, userPosition.lat], zoom: 15, duration: 600 });
  };

  return (
    <button onClick={handleLocate} aria-label="Centrer la carte sur ma position"
      className={`fixed right-4 z-20 w-12 h-12 bg-white rounded-full shadow-float flex items-center justify-center active:bg-gray-100
        ${isFollowingUser && userPosition ? 'text-[#1a73e8]' : 'text-ink-2'}`}
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
      <Icon name="locate" size={24} />
    </button>
  );
}
