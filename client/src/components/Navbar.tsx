// client/src/components/Navbar.tsx
import React from 'react';

interface NavbarProps {
  onSignOut: () => void;
  silo: 'Boreal' | 'Site Level Financial';
  onSiloSwitch: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSignOut, silo, onSiloSwitch }) => {
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-bold' : ''}`;

  return (
    <nav className="flex items-center justify-between bg-gray-800 text-white px-4 py-2">
      <div className="flex items-center space-x-4">
        <button
          onClick={onSiloSwitch}
          className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
        >
          {silo}
        </button>
        <NavLink to="/" className={linkClasses}>Dashboard</NavLink>
        <NavLink to="/pipeline" className={linkClasses}>Pipeline</NavLink>
        <NavLink to="/contacts" className={linkClasses}>Contacts</NavLink>
        <NavLink to="/documents" className={linkClasses}>Documents</NavLink>
        <NavLink to="/crm" className={linkClasses}>Communications</NavLink>
        {/* Add other NavLinks as needed */}
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
