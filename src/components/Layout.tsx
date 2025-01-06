import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ListChecks, Store, UtensilsCrossed, Settings, ShoppingBasket } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm fixed top-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">PantryPal</h1>
          </div>
          {user && (
            <button 
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 pt-20">
        <Outlet />
      </main>

      <nav className="bg-white shadow-lg fixed bottom-0 w-full pb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around">
            <NavLink
              to="/lists"
              className={({ isActive }) =>
                `flex flex-col items-center p-4 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <ListChecks size={24} />
              <span className="text-xs mt-1">Lists</span>
            </NavLink>
            <NavLink
              to="/stores"
              className={({ isActive }) =>
                `flex flex-col items-center p-4 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <Store size={24} />
              <span className="text-xs mt-1">Stores</span>
            </NavLink>
            <NavLink
              to="/meals"
              className={({ isActive }) =>
                `flex flex-col items-center p-4 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <UtensilsCrossed size={24} />
              <span className="text-xs mt-1">Meals</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex flex-col items-center p-4 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <Settings size={24} />
              <span className="text-xs mt-1">Settings</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
