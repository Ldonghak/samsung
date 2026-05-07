import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </AppProvider>
);

export default App;
