import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CoverLetter from './pages/CoverLetter';
import Interview from './pages/Interview';
import Skills from './pages/Skills';
import Coach from './pages/Coach';
import Settings from './pages/Settings';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/cover-letter" element={<CoverLetter />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/skills" element={<Skills />} />
      <Route path="/coach" element={<Coach />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default AppRouter;

