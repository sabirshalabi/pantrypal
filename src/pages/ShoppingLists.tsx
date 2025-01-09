import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { NewListModal } from '../components/NewListModal';
import { database } from '../lib/firebase';
import { ref, onValue, query, orderByChild, remove } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShoppingList } from '../types/ShoppingList';

export function ShoppingLists() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Create a query to fetch lists ordered by creation date
    const listsRef = query(
      ref(database, `lists/${user.uid}`),
      orderByChild('createdAt')
    );

    const unsubscribe = onValue(listsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and process each list's items
        const listsArray = Object.entries(data).map(([id, list]: [string, any]) => ({
          ...list,
          id,
          items: list.items ? Object.values(list.items) : []
        }));
        setLists(listsArray.reverse());
      } else {
        setLists([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const calculateProgress = (list: ShoppingList) => {
    if (!list.items?.length) return 0;
    const completedItems = list.items.filter(item => item.completed).length;
    return Math.round((completedItems / list.items.length) * 100);
  };

  const handleListClick = (listId: string) => {
    console.log('Navigating to list:', listId);
    navigate(`/lists/${listId}`);
  };

  const handleDeleteList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering list click when deleting
    
    if (!user || !window.confirm('Are you sure you want to delete this list?')) return;

    try {
      await remove(ref(database, `lists/${user.uid}/${listId}`));
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Shopping Lists</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => {
          const progress = calculateProgress(list);
          const items = list.items || [];
          const itemCount = items.length;
          
          return (
            <div 
              key={list.id}
              onClick={() => handleListClick(list.id)}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                <button
                  onClick={(e) => handleDeleteList(list.id, e)}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {itemCount} items
              </p>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{progress}% completed</p>
              </div>
            </div>
          );
        })}

        {lists.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No shopping lists yet. Create one to get started!</p>
          </div>
        )}
      </div>

      <NewListModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
