import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, push, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Store, StoreType } from '../types/Store';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: Store;
  onStoreUpdated?: () => void;
}

const storeTypes: { value: StoreType; label: string }[] = [
  { value: 'grocery', label: 'Grocery Store' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'convenience', label: 'Convenience Store' },
  { value: 'farmers_market', label: "Farmer's Market" },
  { value: 'specialty', label: 'Specialty Store' },
  { value: 'other', label: 'Other' },
];

export function StoreModal({ isOpen, onClose, store, onStoreUpdated }: StoreModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    type: 'grocery' as StoreType,
    favorite: false
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        type: store.type,
        favorite: store.favorite
      });
    } else {
      setFormData({
        name: '',
        type: 'grocery',
        favorite: false
      });
    }
  }, [store]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const timestamp = Date.now();
      
      if (store) {
        // Update existing store
        await update(ref(database, `stores/${user.uid}/${store.id}`), {
          ...formData,
          updatedAt: timestamp
        });
      } else {
        // Create new store
        const storeRef = push(ref(database, `stores/${user.uid}`));
        await update(storeRef, {
          ...formData,
          id: storeRef.key,
          userId: user.uid,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      onStoreUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Failed to save store. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">
          {store ? 'Edit Store' : 'Add New Store'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Store Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as StoreType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {storeTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="favorite"
              checked={formData.favorite}
              onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="favorite" className="ml-2 block text-sm text-gray-900">
              Add to Favorites
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {store ? 'Save Changes' : 'Add Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
