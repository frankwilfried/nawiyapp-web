import { Routes, Route } from 'react-router-dom';
import Home          from './pages/Home';
import DriverMode    from './pages/DriverMode';
import Admin         from './pages/Admin';
import Login         from './pages/Login';
import TaxiPassenger from './pages/TaxiPassenger';
import TaxiDriver    from './pages/TaxiDriver';
import RecordRoute      from './pages/RecordRoute';
import DriveSession     from './pages/DriveSession';
import PassengerRecord  from './pages/PassengerRecord';

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Home />} />
      <Route path="/driver"        element={<DriverMode />} />
      <Route path="/admin"         element={<Admin />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/taxi"          element={<TaxiPassenger />} />
      <Route path="/taxi/driver"   element={<TaxiDriver />} />
      <Route path="/record-route"    element={<RecordRoute />} />
      <Route path="/drive"           element={<DriveSession />} />
      <Route path="/record-trip"     element={<PassengerRecord />} />
    </Routes>
  );
}
