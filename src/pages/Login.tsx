import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShoppingBasket } from 'lucide-react';

export function Login() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="bg-white p-4 rounded-full inline-block shadow-md mb-4">
            <ShoppingBasket size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PantryPal</h1>
          <p className="text-gray-600">Your smart grocery shopping companion</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            Continue with Google
          </button>

          <div className="mt-6 text-center text-sm text-gray-600">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}