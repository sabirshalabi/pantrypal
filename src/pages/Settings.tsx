import React from 'react';
import { Moon, Bell, Share2 } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center">
            <Moon size={20} className="text-gray-500 mr-3" />
            <span className="font-medium">Dark Mode</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center">
            <Bell size={20} className="text-gray-500 mr-3" />
            <span className="font-medium">Notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Share2 size={20} className="text-gray-500 mr-3" />
            <span className="font-medium">Share Lists</span>
          </div>
          <button className="text-blue-600 hover:text-blue-700">
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}