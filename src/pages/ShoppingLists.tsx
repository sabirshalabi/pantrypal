import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar, Minus, ShoppingBasket } from 'lucide-react';
import { NewListModal } from '../components/NewListModal';
import { ref, onValue, query, orderByChild, remove, update, push, get } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShoppingList } from '../types/ShoppingList';
import { useFirebase } from '../context/FirebaseContext';
import { Button } from '../components/ui/button';

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

  const groupItemsByStore = (items: ListItem[]) => {
    const grouped = items.reduce((acc, item) => {
      const storeId = item.storeId || 'unassigned';
      if (!acc[storeId]) {
        acc[storeId] = [];
      }
      acc[storeId].push(item);
      return acc;
    }, {} as Record<string, ListItem[]>);
    return grouped;
  };

  const renderGroupedItems = (items: ListItem[], list: ShoppingList) => {
    const groupedItems = groupItemsByStore(items);
    
    return Object.entries(groupedItems).map(([storeId, storeItems]) => {
      const store = stores.find(s => s.id === storeId);
      const storeName = store ? store.name : 'Other';
      
      return (
        <div key={storeId} className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{storeName}</h3>
          <div className="space-y-2">
            {storeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleComplete(list.id, item.id)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <span className={item.completed ? 'line-through text-gray-500' : ''}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleUpdateQuantity(list.id, item.id, item.quantity - 1)}
                    variant="ghost"
                    size="icon"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    onClick={() => handleUpdateQuantity(list.id, item.id, item.quantity + 1)}
                    variant="ghost"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <select
                    value={item.storeId || ''}
                    onChange={(e) => handleUpdateStore(list.id, item.id, e.target.value)}
                    className="ml-2 p-1 border rounded"
                  >
                    <option value="">Store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => handleDeleteItem(list.id, item.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900">Shopping Lists</h2>
        <Button 
          onClick={() => setIsModalOpen(true)}
          variant="default"
          size="icon"
          className="rounded-full"
          aria-label="Create new list"
        >
          <Plus size={20} />
        </Button>
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
                className="flex w-full flex-col overflow-hidden border border-zinc-200 bg-white hover:bg-gray-50/50 transition-colors"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                        <ShoppingBasket className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <MorphingDialogTitle className="text-lg font-semibold text-zinc-900">
                          {list.name}
                        </MorphingDialogTitle>
                        <MorphingDialogSubtitle className="text-sm text-zinc-500">
                          {itemCount} items • {progress}% complete
                        </MorphingDialogSubtitle>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportMealPlanIngredients(list.id);
                        }}
                        variant="ghost"
                        size="icon"
                        className="text-zinc-600"
                        aria-label="Import meal plan ingredients"
                      >
                        <Calendar size={16} />
                      </Button>
                      <Button
                        onClick={(e) => startEditingListName(list, e)}
                        variant="ghost"
                        size="icon"
                        className="text-zinc-600"
                        aria-label="Edit list name"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        aria-label="Delete list"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
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
                          <Button
                            onClick={() => handleUpdateListName(list.id)}
                            variant="default"
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingListId(null);
                              setEditingListName('');
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <MorphingDialogTitle className="text-2xl font-semibold text-zinc-900">
                            {list.name}
                          </MorphingDialogTitle>
                          <Button
                            onClick={(e) => startEditingListName(list, e)}
                            variant="outline"
                            size="icon"
                            className="text-zinc-600"
                            aria-label="Edit list name"
                          >
                            <Pencil size={16} />
                          </Button>
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
                      <Button
                        type="submit"
                        variant="default"
                        size="sm"
                      >
                        Add Item
                      </Button>
                    </form>

                    <div className="space-y-4">
                      {list.items && list.items.length > 0 ? (
                        renderGroupedItems(list.items, list)
                      ) : (
                        <p className="text-gray-500 text-center py-4">No items in this list</p>
                      )}
                    </div>
                  </MorphingDialogDescription>
                  <MorphingDialogClose className="absolute right-6 top-6 text-zinc-500 hover:text-zinc-700" />
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
          );
        })}
        {lists.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-blue-50 p-3 mb-4">
              <ShoppingBasket className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No shopping lists found</h3>
            <p className="text-zinc-500 mb-6">
              Create your first shopping list to get started!
            </p>
          </div>
        )}
      </div>
      
      <NewListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
