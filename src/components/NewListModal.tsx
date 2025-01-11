import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { useFirebase } from '../context/FirebaseContext';

interface NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated?: () => void;
}

export function NewListModal({ isOpen, onClose, onListCreated }: NewListModalProps) {
  const [listName, setListName] = useState('');
  const { user } = useAuth();
  const { database } = useFirebase();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !listName.trim()) return;

    try {
      // Create a new list reference
      const listRef = push(ref(database, `lists/${user.uid}`));
      
      // Set the list data
      await set(listRef, {
        id: listRef.key,
        name: listName.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: user.uid,
        items: {} // Initialize as an empty object for Firebase
      });

      setListName('');
      onListCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list. Please try again.');
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
        
        <h2 className="text-xl font-semibold mb-4">Create New List</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-1">
              List Name
            </label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Weekly Groceries"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
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
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
