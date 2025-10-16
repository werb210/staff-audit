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
  );
};

export default App;
