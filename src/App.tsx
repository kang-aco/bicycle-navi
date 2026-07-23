import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { RideHistory } from './pages/RideHistory';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/history" element={<RideHistory />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
