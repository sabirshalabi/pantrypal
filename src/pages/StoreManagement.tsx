import React, { useState, useEffect } from 'react';
import { Plus, Star, StarOff, Edit2, Trash2, Store as StoreIcon } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Store } from '../types/Store';
import { StoreModal } from '../components/StoreModal';

export function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | undefined>();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const storesRef = ref(database, `stores/${user.uid}`);
    const unsubscribe = onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesArray = Object.entries(data).map(([id, store]: [string, any]) => ({
          ...store,
          id
        }));
        // Sort by favorite first, then by name
        storesArray.sort((a, b) => {
          if (a.favorite === b.favorite) {
            return a.name.localeCompare(b.name);
          }
          return a.favorite ? -1 : 1;
        });
        setStores(storesArray);
      } else {
        setStores([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setIsModalOpen(true);
  };

  const handleDelete = async (storeId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this store?')) return;

    try {
      await remove(ref(database, `stores/${user.uid}/${storeId}`));
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Failed to delete store. Please try again.');
    }
  };

  const toggleFavorite = async (store: Store) => {
    if (!user) return;

    try {
      await update(ref(database, `stores/${user.uid}/${store.id}`), {
        favorite: !store.favorite,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert('Failed to update favorite status. Please try again.');
    }
  };

  const getStoreTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      grocery: 'Grocery Store',
      supermarket: 'Supermarket',
      convenience: 'Convenience Store',
      farmers_market: "Farmer's Market",
      specialty: 'Specialty Store',
      other: 'Other'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Stores</h2>
        <button
          onClick={() => {
            setSelectedStore(undefined);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <StoreIcon className="text-blue-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">{getStoreTypeLabel(store.type)}</p>
              </div>
              <button
                onClick={() => toggleFavorite(store)}
                className="text-yellow-500 hover:text-yellow-600"
              >
                {store.favorite ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
              </button>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleEdit(store)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit2 size={20} />
              </button>
              <button
                onClick={() => handleDelete(store.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}

        {stores.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No stores added yet. Add your first store to get started!</p>
          </div>
        )}
      </div>

      <StoreModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStore(undefined);
        }}
        store={selectedStore}
      />
    </div>
  );
}