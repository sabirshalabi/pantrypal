import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../lib/firebase';
import { ref, onValue, update, push, remove } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { ShoppingList, ShoppingListItem } from '../types/ShoppingList';
import { Store } from '../types/Store';
import { Check, Trash2, Store as StoreIcon } from 'lucide-react';

export function ListDetail() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    storeId: ''
  });

  useEffect(() => {
    if (!user || !listId) return;

    const listRef = ref(database, `lists/${user.uid}/${listId}`);
    const unsubscribeList = onValue(listRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setList({
          ...data,
          items: data.items || {}
        });
      } else {
        console.log('No list found');
        navigate('/lists');
      }
    });

    const storesRef = ref(database, `stores/${user.uid}`);
    const unsubscribeStores = onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesArray = Object.entries(data).map(([id, store]: [string, any]) => ({
          ...store,
          id
        }));
        setStores(storesArray);
      } else {
        setStores([]);
      }
    });

    return () => {
      unsubscribeList();
      unsubscribeStores();
    };
  }, [user, listId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listId || !newItem.name) return;

    try {
      const itemRef = push(ref(database, `lists/${user.uid}/${listId}/items`));
      const itemData: ShoppingListItem = {
        id: itemRef.key!,
        name: newItem.name,
        quantity: newItem.quantity,
        completed: false,
        storeId: newItem.storeId || undefined,
        addedAt: Date.now()
      };

      await update(itemRef, itemData);
      setNewItem({ name: '', quantity: 1, storeId: '' });
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  const toggleItemComplete = async (itemId: string, completed: boolean) => {
    if (!user || !listId) return;

    try {
      await update(ref(database, `lists/${user.uid}/${listId}/items/${itemId}`), {
        completed: !completed
      });
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user || !listId || !window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await remove(ref(database, `lists/${user.uid}/${listId}/items/${itemId}`));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const updateItemStore = async (itemId: string, storeId: string) => {
    if (!user || !listId) return;

    try {
      await update(ref(database, `lists/${user.uid}/${listId}/items/${itemId}`), {
        storeId: storeId || null
      });
    } catch (error) {
      console.error('Error updating item store:', error);
      alert('Failed to update item store. Please try again.');
    }
  };

  if (!list) {
    return <div className="p-4">Loading...</div>;
  }

  const items = Object.values(list.items || {}).sort((a, b) => b.addedAt - a.addedAt);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{list.name}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <input
              type="text"
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Quantity"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>
          <div>
            <select
              value={newItem.storeId}
              onChange={(e) => setNewItem({ ...newItem, storeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Store</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Item
          </button>
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-2 rounded-md ${
                item.completed ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <button
                  onClick={() => toggleItemComplete(item.id, item.completed)}
                  className={`flex-shrink-0 h-5 w-5 rounded border ${
                    item.completed
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300'
                  } flex items-center justify-center`}
                >
                  {item.completed && <Check size={12} />}
                </button>
                <span className={item.completed ? 'line-through text-gray-500' : ''}>
                  {item.quantity > 1 && `${item.quantity} `}
                  {item.name}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={item.storeId || ''}
                  onChange={(e) => updateItemStore(item.id, e.target.value)}
                  className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Store</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                {item.storeId && (
                  <StoreIcon 
                    size={16} 
                    className="text-blue-600"
                    title={stores.find(s => s.id === item.storeId)?.name}
                  />
                )}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items in this list yet. Add some items to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
