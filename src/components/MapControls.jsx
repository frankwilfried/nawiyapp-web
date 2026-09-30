import { useMapStore } from '../store/mapStore';

export default function MapControls({ mapRef, userPosition }) {
  const { startFollowingUser } = useMapStore();

  const handleLocate = () => {
    startFollowingUser();
    if (userPosition && mapRef.current) {
      mapRef.current.easeTo({ center: [userPosition.lng, userPosition.lat], zoom: 15, duration: 600 });
    }
  };

  return (
    <div className="fixed right-4 bottom-48 z-20 flex flex-col gap-2">
      <button onClick={handleLocate}
        className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition"
        title="Ma position">
        <svg className="w-5 h-5 text-nawiy-green" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 9.5A2.5 2.5 0 1012 6.5a2.5 2.5 0 000 5z" />
        </svg>
      </button>
      <a href="/driver"
        className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition text-lg"
        title="Mode Chauffeur collectif">🚌</a>
      <a href="/taxi/driver"
        className="w-11 h-11 bg-nawiy-dark rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition text-lg"
        title="Mode Chauffeur Taxi">🚕</a>
    </div>
  );
}
