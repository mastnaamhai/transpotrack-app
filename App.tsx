import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import LorryReceipts from './pages/LorryReceipts';
import { Invoices } from './pages/Invoices';
import Ledger from './pages/Ledger';
import { Settings } from './pages/Settings';
import { TransportProvider } from './context/TransportContext';
import TripManagement from './pages/TripManagement';
import Clients from './pages/Clients';
import { MenuIcon } from './components/icons';

const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <TransportProvider>
      <HashRouter>
        <div className="flex h-screen bg-gray-100">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isMobileOpen={isMobileOpen}
            onMobileClose={() => setIsMobileOpen(false)}
          />
          <div className="flex flex-col flex-1 w-full overflow-hidden">
            <header className="lg:hidden bg-white border-b border-gray-200 flex-shrink-0 z-10">
              <div className="h-16 flex items-center justify-between px-4">
                <div className="text-xl font-bold text-brand-primary">TranspoTrack</div>
                <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-md text-gray-500 hover:bg-gray-100" aria-label="Open sidebar">
                  <MenuIcon className="w-6 h-6" />
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-white">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/lorry-receipts" element={<LorryReceipts />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/trip-management" element={<TripManagement />} />
                <Route path="/ledger" element={<Ledger />} />
                <Route path="/ledger/client/:clientId" element={<Ledger />} />
                <Route path="/ledger/supplier/:supplierId" element={<Ledger />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
          {isMobileOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            ></div>
          )}
        </div>
      </HashRouter>
    </TransportProvider>
  );
};

export default App;
