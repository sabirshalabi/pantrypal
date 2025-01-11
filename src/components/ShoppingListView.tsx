import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../lib/firebase';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { ShoppingListItem } from './ShoppingListItem';
import { ArrowLeft } from 'lucide-react';

interface Store {
  id: string;
  name: string;
}

interface ListItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  notes?: string;
  completed: boolean;
  storeId?: string;
}

export function ShoppingListView() {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!user || !listId) return;

    const listRef = ref(database, `lists/${user.uid}/${listId}`);
    const unsubscribeList = onValue(listRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setListName(data.name);
        if (data.items) {
          const itemsArray = Object.entries(data.items).map(([id, item]: [string, any]) => ({
            ...item,
            id,
          }));
          setItems(itemsArray);
        } else {
          setItems([]);
        }
      } else {
        navigate('/lists');
      }
    });

    const storesRef = ref(database, `stores/${user.uid}`);
    const unsubscribeStores = onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesArray = Object.entries(data).map(([id, store]: [string, any]) => ({
          ...store,
          id,
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

  const handleToggleComplete = async (itemId: string) => {
    if (!user || !listId) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      await update(
        ref(database, `lists/${user.uid}/${listId}/items/${itemId}`),
        {
          completed: !item.completed,
        }
      );
    } catch (error) {
      console.error('Error toggling item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user || !listId || !window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await remove(ref(database, `lists/${user.uid}/${listId}/items/${itemId}`));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleUpdateStore = async (itemId: string, storeId: string) => {
    if (!user || !listId) return;

    try {
      await update(
        ref(database, `lists/${user.uid}/${listId}/items/${itemId}`),
        {
          storeId: storeId || null,
        }
      );
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Failed to update store. Please try again.');
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!user || !listId) return;

    try {
      await update(
        ref(database, `lists/${user.uid}/${listId}/items/${itemId}`),
        {
          quantity,
        }
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity. Please try again.');
    }
  };

  const calculateProgress = () => {
    if (!items.length) return 0;
    const completedItems = items.filter((item) => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/lists')}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{listName}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {items.length} items • {calculateProgress()}% complete
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <ShoppingListItem
            key={item.id}
            item={item}
            stores={stores}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteItem}
            onUpdateStore={handleUpdateStore}
            onUpdateQuantity={handleUpdateQuantity}
          />
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-zinc-200 p-8 text-center dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400">No items in this list. Add some items to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
