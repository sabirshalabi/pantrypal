import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { NewListModal } from '../components/NewListModal';
import { database } from '../lib/firebase';
import { ref, onValue, query, orderByChild } from 'firebase/database';
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
          const itemCount = list.items?.length || 0;
          const categories = new Set(list.items?.map(item => item.category) || []);
          
          return (
            <div 
              key={list.id}
              onClick={() => handleListClick(list.id)}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {itemCount} items • {categories.size} categories
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