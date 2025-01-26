import React, { useState, useEffect } from 'react';
import { Plus, Star, StarOff, Edit2, Trash2, Store as StoreIcon } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Store } from '../types/Store';
import { StoreModal } from '../components/StoreModal';
import { Button } from '../components/ui/button';

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
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900">Stores</h2>
        <Button
          onClick={() => {
            setSelectedStore(undefined);
            setIsModalOpen(true);
          }}
          variant="default"
          size="icon"
          className="rounded-full"
          aria-label="Add new store"
        >
          <Plus size={20} />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div
            key={store.id}
            className="flex w-full flex-col overflow-hidden border border-zinc-200 bg-white rounded-lg p-6 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <StoreIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{store.name}</h3>
                  <p className="text-sm text-zinc-500">{getStoreTypeLabel(store.type)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => toggleFavorite(store)}
                  variant="ghost"
                  size="icon"
                  className="text-yellow-500"
                >
                  {store.favorite ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => handleEdit(store)}
                  variant="ghost"
                  size="icon"
                  className="text-zinc-500"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(store.id)}
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {store.address && (
              <p className="mt-2 text-sm text-zinc-500">{store.address}</p>
            )}
          </div>
        ))}
        {stores.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-blue-50 p-3 mb-4">
              <StoreIcon className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No stores found</h3>
            <p className="text-zinc-500 mb-6">
              Add your first store to get started!
            </p>
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