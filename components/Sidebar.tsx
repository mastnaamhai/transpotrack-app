import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, TruckIcon, DocumentTextIcon, BookOpenIcon, CogIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, UsersIcon, BriefcaseIcon } from './icons';

const navItems = [
  { name: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'Clients', to: '/clients', icon: UsersIcon },
  { name: 'Lorry Receipts', to: '/lorry-receipts', icon: TruckIcon },
  { name: 'Invoices', to: '/invoices', icon: DocumentTextIcon },
  { name: 'Trip Management', to: '/trip-management', icon: BriefcaseIcon },
  { name: 'Ledger', to: '/ledger', icon: BookOpenIcon },
  { name: 'Settings', to: '/settings', icon: CogIcon },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, onMobileClose }: SidebarProps) => {
  const baseLinkClasses = "flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-colors duration-200";
  const inactiveLinkClasses = "text-gray-100 hover:bg-brand-secondary";
  const activeLinkClasses = "bg-brand-accent text-brand-primary";
  
  const NavLinks = () => (
    <>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses} ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
    </>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-brand-primary text-white flex flex-col z-40 transition-transform duration-300 ease-in-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-brand-secondary flex-shrink-0">
          TranspoTrack
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`bg-brand-primary text-white flex-shrink-0 flex-col transition-all duration-300 ease-in-out hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-brand-secondary flex-shrink-0">
          {isCollapsed ? 'TT' : 'TranspoTrack'}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-brand-secondary">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-3 rounded-lg text-gray-100 hover:bg-brand-secondary transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronDoubleRightIcon className="w-5 h-5" /> : <ChevronDoubleLeftIcon className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
};
