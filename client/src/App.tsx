// client/src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
// Import your page components:
import Dashboard from './pages/Dashboard';
import SalesPipeline from './pages/SalesPipeline';
import Contacts from './pages/Contacts';
import Communications from './pages/Communications';
import TasksCalendar from './pages/TasksCalendar';
import Marketing from './pages/Marketing';
import Reports from './pages/Reports';
import Lenders from './pages/Lenders';
import Settings from './pages/Settings';

function App() {
  const [silo, setSilo] = useState<'Boreal' | 'Site Level Financial'>('Boreal');

  const handleSignOut = () => {
    // clear auth tokens, redirect to login screen
  };

  const handleSiloSwitch = () => {
    setSilo(prev => (prev === 'Boreal' ? 'Site Level Financial' : 'Boreal'));
  };

  return (
    <BrowserRouter>
      <Navbar onSignOut={handleSignOut} silo={silo} onSiloSwitch={handleSiloSwitch} />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<SalesPipeline />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/tasks" element={<TasksCalendar />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/lenders" element={<Lenders />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
