// client/src/App.tsx
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import DocumentsPage from './pages/DocumentsPage';
import CRMPage from './pages/CRMPage';

const App: React.FC = () => {
  const [silo, setSilo] = useState<'Boreal' | 'Site Level Financial'>('Boreal');

  const handleSignOut = () => {
    // TODO: sign-out logic (e.g. clear auth token, redirect to login)
    console.log('Signing out...');
  };

  const handleSiloSwitch = () => {
    setSilo(prev => (prev === 'Boreal' ? 'Site Level Financial' : 'Boreal'));
  };

  return (
    <Router>
      <Navbar onSignOut={handleSignOut} silo={silo} onSiloSwitch={handleSiloSwitch} />
      <main className="p-4">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/contacts" element={<CRMPage />} />
          {/* add more routes as needed */}
        </Routes>
      </main>
    </Router>
  );
};

export default App;
