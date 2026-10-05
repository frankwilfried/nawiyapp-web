import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useLangStore } from './i18n';
import Home          from './pages/Home';
import DriverMode    from './pages/DriverMode';
import Admin         from './pages/Admin';
import Login         from './pages/Login';
import TaxiPassenger from './pages/TaxiPassenger';
import TaxiDriver    from './pages/TaxiDriver';
import RecordRoute      from './pages/RecordRoute';
import DriveSession     from './pages/DriveSession';
import PassengerRecord  from './pages/PassengerRecord';
import Legal            from './pages/Legal';
import Account          from './pages/Account';
import MyRides          from './pages/MyRides';
import Receipt          from './pages/Receipt';
import EmergencyContacts from './pages/EmergencyContacts';
import Track            from './pages/Track';
import BottomNav        from './components/BottomNav';
import OfflineBanner    from './components/OfflineBanner';

const BOTTOM_NAV_PATHS = ['/', '/driver', '/compte'];

function Layout() {
  const { pathname } = useLocation();
  const showNav = BOTTOM_NAV_PATHS.includes(pathname);

  return (
    <>
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/driver"        element={<DriverMode />} />
        <Route path="/admin"         element={<Admin />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/taxi"          element={<TaxiPassenger />} />
        <Route path="/taxi/driver"   element={<TaxiDriver />} />
        <Route path="/record-route"  element={<RecordRoute />} />
        <Route path="/drive"         element={<DriveSession />} />
        <Route path="/record-trip"   element={<PassengerRecord />} />
        <Route path="/compte"        element={<Account />} />
        <Route path="/compte/urgence" element={<EmergencyContacts />} />
        <Route path="/courses"       element={<MyRides />} />
        <Route path="/courses/:id"   element={<Receipt />} />
        <Route path="/suivi/:token"  element={<Track />} />
        <Route path="/conditions"    element={<Legal doc="terms" />} />
        <Route path="/confidentialite" element={<Legal doc="privacy" />} />
      </Routes>
      {showNav && <BottomNav />}
      <OfflineBanner />
    </>
  );
}

// Changer de langue recrée l'interface : tous les textes passent dans la nouvelle langue
export default function App() {
  const lang = useLangStore(st => st.lang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <Layout key={lang} />;
}
