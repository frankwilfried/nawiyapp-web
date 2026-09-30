import { Routes, Route, useLocation } from 'react-router-dom';
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
import BottomNav        from './components/BottomNav';

const BOTTOM_NAV_PATHS = ['/', '/driver'];

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
        <Route path="/conditions"    element={<Legal doc="terms" />} />
        <Route path="/confidentialite" element={<Legal doc="privacy" />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return <Layout />;
}
