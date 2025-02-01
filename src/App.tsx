import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { ShoppingLists } from './pages/ShoppingLists';
import { StoreManagement } from './pages/StoreManagement';
import { MealPlanning } from './pages/MealPlanning';
import { Settings } from './pages/Settings';
import { ListDetail } from './pages/ListDetail';
import { Recipes } from './pages/Recipes';
import { ImportList } from './pages/ImportList';
import { checkPWAStatus } from './utils/pwaStatus';
import paperTexture from './assets/paper_texture.jpeg';

function App() {
  useEffect(() => {
    checkPWAStatus();
    // Set the background image as a CSS variable
    document.documentElement.style.setProperty('--paper-texture', `url(${paperTexture})`);
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Redirect root to /lists */}
          <Route path="/" element={<Navigate to="/lists" replace />} />
          
          {/* Main routes */}
          <Route path="/lists" element={<ShoppingLists />} />
          <Route path="/lists/:listId" element={<ListDetail />} />
          <Route path="/stores" element={<StoreManagement />} />
          <Route path="/meals" element={<MealPlanning />} />
          <Route path="/recipes/*" element={<Recipes />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/import-list/:shareToken" element={
          <PrivateRoute>
            <ImportList />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
