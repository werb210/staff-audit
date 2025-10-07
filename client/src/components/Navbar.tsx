// client/src/components/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onSignOut: () => void;
  silo: 'Boreal' | 'Site Level Financial';
  onSiloSwitch: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSignOut, silo, onSiloSwitch }) => {
  return (
    <nav className="flex items-center justify-between bg-gray-800 text-white px-4 py-2">
      <div className="flex items-center space-x-4">
        <button
          onClick={onSiloSwitch}
          className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
        >
          {silo}
        </button>
        <Link to="/" className="font-bold">Dashboard</Link>
        <Link to="/pipeline">Pipeline</Link>
        <Link to="/contacts">Contacts</Link>
        <Link to="/communications">Communications</Link>
        <Link to="/tasks">Tasks & Calendar</Link>
        <Link to="/marketing">Marketing</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/lenders">Lenders</Link>
        <Link to="/settings">Settings</Link>
      </div>
      <button
        onClick={onSignOut}
        className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500"
      >
        Sign Out
      </button>
    </nav>
  );
};

export default Navbar;
