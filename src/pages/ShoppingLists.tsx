import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { NewListModal } from '../components/NewListModal';
import { ref, onValue, query, orderByChild, remove, update, push, get } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShoppingList } from '../types/ShoppingList';
import { useFirebase } from '../context/FirebaseContext';
import NumberInput from '../components/ui/number-input';

import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogDescription,
  MorphingDialogContainer,
} from '../components/ui/morphing-dialog';

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

interface NewItemForm {
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  storeId: string;
}

export function ShoppingLists() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { database } = useFirebase();

  const [newItem, setNewItem] = useState<NewItemForm>({
    name: '',
    quantity: 1,
    unit: '',
    notes: '',
    storeId: '',
  });

  useEffect(() => {
    if (!user) return;

    const listsRef = query(
      ref(database, `lists/${user.uid}`),
      orderByChild('createdAt')
    );

    const unsubscribeLists = onValue(listsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const listsArray = Object.entries(data).map(([id, list]: [string, any]) => ({
          ...list,
          id,
          items: list.items ? Object.entries(list.items).map(([itemId, item]: [string, any]) => ({
            ...item,
            id: itemId,
          })) : []
        }));
        setLists(listsArray.reverse());
      } else {
        setLists([]);
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

    const mealPlansRef = ref(database, `mealPlans/${user.uid}`);
    const unsubscribeMealPlans = onValue(mealPlansRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const plansArray = Object.entries(data).map(([id, plan]: [string, any]) => ({
          ...plan,
          id
        }));
        setMealPlans(plansArray);
      } else {
        setMealPlans([]);
      }
    });

    return () => {
      unsubscribeLists();
      unsubscribeStores();
      unsubscribeMealPlans();
    };
  }, [user, database]);

  const calculateProgress = (list: ShoppingList) => {
    if (!list.items?.length) return 0;
    const completedItems = list.items.filter(item => item.completed).length;
    return Math.round((completedItems / list.items.length) * 100);
  };

  const handleDeleteList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || !window.confirm('Are you sure you want to delete this list?')) return;

    try {
      await remove(ref(database, `lists/${user.uid}/${listId}`));
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  const handleUpdateListName = async (listId: string) => {
    if (!user || !editingListName.trim()) return;

    try {
      await update(ref(database, `lists/${user.uid}/${listId}`), {
        name: editingListName.trim()
      });
      setEditingListId(null);
      setEditingListName('');
    } catch (error) {
      console.error('Error updating list name:', error);
      alert('Failed to update list name. Please try again.');
    }
  };

  const startEditingListName = (list: ShoppingList, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  const handleAddItem = async (listId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listId || !newItem.name.trim()) return;

    try {
      const itemRef = push(ref(database, `lists/${user.uid}/${listId}/items`));
      const newItemData = {
        name: newItem.name.trim(),
        quantity: 1,
        unit: newItem.unit.trim(),
        notes: newItem.notes.trim(),
        storeId: newItem.storeId || null,
        completed: false,
        createdAt: Date.now(),
      };

      await update(itemRef, newItemData);
      setNewItem({
        name: '',
        quantity: 1,
        unit: '',
        notes: '',
        storeId: '',
      });
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  const handleToggleComplete = async (listId: string, itemId: string) => {
    if (!user || !listId) return;

    const list = lists.find(l => l.id === listId);
    const item = list?.items.find(i => i.id === itemId);
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

  const handleDeleteItem = async (listId: string, itemId: string) => {
    if (!user || !listId || !window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await remove(ref(database, `lists/${user.uid}/${listId}/items/${itemId}`));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleUpdateStore = async (listId: string, itemId: string, storeId: string) => {
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

  const handleUpdateQuantity = async (listId: string, itemId: string, quantity: number) => {
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

  const handleImportMealPlanIngredients = async (listId: string) => {
    if (!user) return;

    try {
      // Get current week's meal plan
      const currentDate = new Date();
      const currentWeekPlan = mealPlans.find(plan => {
        const startDate = new Date(plan.startDate);
        const endDate = new Date(plan.endDate);
        return currentDate >= startDate && currentDate <= endDate;
      });

      if (!currentWeekPlan) {
        alert('No meal plan found for the current week.');
        return;
      }

      // Get all meals for the current week
      const mealsRef = ref(database, `meals/${user.uid}`);
      const mealsSnapshot = await get(mealsRef);
      const mealsData = mealsSnapshot.val();

      if (!mealsData) return;

      // Collect all ingredients from the meals in the meal plan
      const ingredients = currentWeekPlan.meals.reduce((acc: any[], dailyMeal: any) => {
        const meal = mealsData[dailyMeal.mealId];
        if (meal && meal.ingredients) {
          return [...acc, ...meal.ingredients];
        }
        return acc;
      }, []);

      // Add ingredients to the shopping list
      const listRef = ref(database, `lists/${user.uid}/${listId}/items`);
      const batch: { [key: string]: any } = {};

      ingredients.forEach((ingredient: any) => {
        const newItemRef = push(ref(database, `lists/${user.uid}/${listId}/items`));
        batch[newItemRef.key as string] = {
          name: ingredient.name,
          quantity: 1,
          unit: '',
          notes: 'Added from meal plan',
          storeId: ingredient.storeId || null,
          completed: false,
          createdAt: Date.now(),
        };
      });

      await update(listRef, batch);
      alert('Meal plan ingredients have been added to your shopping list!');
    } catch (error) {
      console.error('Error importing meal plan ingredients:', error);
      alert('Failed to import meal plan ingredients. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900">Shopping Lists</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
          aria-label="Create new list"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => {
          const progress = calculateProgress(list);
          const items = list.items || [];
          const itemCount = items.length;
          
          return (
            <MorphingDialog
              key={list.id}
              transition={{
                type: 'spring',
                bounce: 0.05,
                duration: 0.25,
              }}
            >
              <MorphingDialogTrigger
                style={{ borderRadius: '12px' }}
                className="flex w-full flex-col overflow-hidden border border-zinc-200 bg-white hover:bg-gray-50"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <MorphingDialogTitle className="text-lg font-semibold text-zinc-900">
                      {list.name}
                    </MorphingDialogTitle>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportMealPlanIngredients(list.id);
                        }}
                        className="flex items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-gray-50"
                        aria-label="Import meal plan ingredients"
                      >
                        <Calendar size={16} />
                      </button>
                      <button
                        onClick={(e) => startEditingListName(list, e)}
                        className="flex items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-gray-50"
                        aria-label="Edit list name"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                        aria-label="Delete list"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <MorphingDialogSubtitle className="mt-1 text-sm text-zinc-600">
                    {itemCount} items • {progress}% complete
                  </MorphingDialogSubtitle>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent
                  style={{ borderRadius: '24px' }}
                  className="pointer-events-auto relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden border border-zinc-200 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 p-6">
                    <div className="flex-1">
                      {editingListId === list.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateListName(list.id);
                              } else if (e.key === 'Escape') {
                                setEditingListId(null);
                                setEditingListName('');
                              }
                            }}
                            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateListName(list.id)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingListId(null);
                              setEditingListName('');
                            }}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <MorphingDialogTitle className="text-2xl font-semibold text-zinc-900">
                            {list.name}
                          </MorphingDialogTitle>
                          <button
                            onClick={(e) => startEditingListName(list, e)}
                            className="flex items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-gray-50"
                            aria-label="Edit list name"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      )}
                      <MorphingDialogSubtitle className="mt-1 text-zinc-600">
                        {itemCount} items • {progress}% complete
                      </MorphingDialogSubtitle>
                    </div>
                  </div>
                  <MorphingDialogDescription className="flex-1 overflow-auto p-6">
                    <form onSubmit={(e) => handleAddItem(list.id, e)} className="mb-4 space-y-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
                      />
                      <input
                        type="text"
                        placeholder="Unit (e.g., pcs, kg)"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
                      />
                      <select
                        value={newItem.storeId}
                        onChange={(e) => setNewItem({ ...newItem, storeId: e.target.value })}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
                      >
                        <option value="">Select Store</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Add Item
                      </button>
                    </form>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <button
                              onClick={() => handleToggleComplete(list.id, item.id)}
                              className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded border ${
                                item.completed
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-zinc-300'
                              }`}
                            >
                              {item.completed && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <span
                              className={`${
                                item.completed
                                  ? 'text-zinc-400 line-through'
                                  : 'text-zinc-900'
                              } text-sm truncate`}
                            >
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <NumberInput
                              value={item.quantity}
                              min={1}
                              max={99}
                              onChange={(event, val) => handleUpdateQuantity(list.id, item.id, val || 1)}
                              className="w-20 flex-shrink-0"
                              aria-label="Quantity"
                            />
                            <div className="flex items-center gap-1">
                              <select
                                value={item.storeId || ''}
                                onChange={(e) => handleUpdateStore(list.id, item.id, e.target.value)}
                                className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
                              >
                                <option value="">Store</option>
                                {stores.map((store) => (
                                  <option key={store.id} value={store.id}>
                                    {store.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleDeleteItem(list.id, item.id)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50"
                                aria-label="Delete item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className="rounded-lg border border-zinc-200 p-8 text-center">
                          <p className="text-zinc-600">
                            No items in this list. Add some items to get started!
                          </p>
                        </div>
                      )}
                    </div>
                  </MorphingDialogDescription>
                  <MorphingDialogClose className="absolute right-6 top-6 text-zinc-500 hover:text-zinc-700" />
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
          );
        })}
      </div>
      
      <NewListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
