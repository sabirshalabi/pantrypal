import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { ShoppingLists } from './pages/ShoppingLists';
import { StoreManagement } from './pages/StoreManagement';
import { MealPlanning } from './pages/MealPlanning';
import { Settings } from './pages/Settings';
import { ListDetail } from './pages/ListDetail';
import { checkPWAStatus } from './utils/pwaStatus';

function App() {
  useEffect(() => {
    checkPWAStatus();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
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
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;