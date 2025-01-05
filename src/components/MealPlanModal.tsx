import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, push, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { MealPlan, Meal, DailyMeal, OtherItem } from '../types/Meal';
import { Store } from '../types/Store';
import { format, startOfWeek, addDays } from 'date-fns';

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlan?: MealPlan;
  meals: Meal[];
  stores: Store[];
}

export function MealPlanModal({ isOpen, onClose, mealPlan, meals, stores }: MealPlanModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    startDate: startOfWeek(new Date()).getTime(),
    endDate: addDays(startOfWeek(new Date()), 6).getTime(),
    meals: [] as DailyMeal[],
    otherItems: [] as OtherItem[]
  });

  useEffect(() => {
    if (mealPlan) {
      setFormData({
        name: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        meals: mealPlan.meals,
        otherItems: mealPlan.otherItems
      });
    } else {
      // Initialize with empty meals for each day of the week
      const startDate = startOfWeek(new Date()).getTime();
      const initialMeals = Array.from({ length: 7 }, (_, i) => ({
        id: Date.now().toString() + i,
        date: addDays(new Date(startDate), i).getTime(),
        mealId: '',
        mealName: ''
      }));

      setFormData({
        name: format(new Date(), "'Week of' MMM d, yyyy"),
        startDate,
        endDate: addDays(new Date(startDate), 6).getTime(),
        meals: initialMeals,
        otherItems: []
      });
    }
  }, [mealPlan]);

  if (!isOpen) return null;

  const handleMealChange = (index: number, mealId: string) => {
    const selectedMeal = meals.find(m => m.id === mealId);
    if (!selectedMeal) return;

    const newMeals = [...formData.meals];
    newMeals[index] = {
      ...newMeals[index],
      mealId,
      mealName: selectedMeal.name
    };
    setFormData({ ...formData, meals: newMeals });
  };

  const handleAddOtherItem = () => {
    setFormData({
      ...formData,
      otherItems: [
        ...formData.otherItems,
        { id: Date.now().toString(), name: '', storeId: undefined, completed: false }
      ]
    });
  };

  const handleRemoveOtherItem = (index: number) => {
    const newItems = [...formData.otherItems];
    newItems.splice(index, 1);
    setFormData({ ...formData, otherItems: newItems });
  };

  const handleOtherItemChange = (index: number, field: keyof OtherItem, value: any) => {
    const newItems = [...formData.otherItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, otherItems: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const timestamp = Date.now();
      
      if (mealPlan) {
        // Update existing meal plan
        await update(ref(database, `mealPlans/${user.uid}/${mealPlan.id}`), {
          ...formData,
          updatedAt: timestamp
        });
      } else {
        // Create new meal plan
        const planRef = push(ref(database, `mealPlans/${user.uid}`));
        await update(planRef, {
          ...formData,
          id: planRef.key,
          userId: user.uid,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Failed to save meal plan. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">
          {mealPlan ? 'Edit Meal Plan' : 'Create New Meal Plan'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name
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
            <h3 className="text-lg font-medium text-gray-900 mb-3">Weekly Meals</h3>
            <div className="space-y-3">
              {formData.meals.map((dailyMeal, index) => (
                <div key={dailyMeal.id} className="flex items-center space-x-4">
                  <div className="w-32">
                    <Calendar size={16} className="inline mr-2 text-gray-500" />
                    {format(new Date(dailyMeal.date), 'EEEE')}
                  </div>
                  <select
                    value={dailyMeal.mealId}
                    onChange={(e) => handleMealChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a meal</option>
                    {meals.map(meal => (
                      <option key={meal.id} value={meal.id}>
                        {meal.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Other Items</h3>
              <button
                type="button"
                onClick={handleAddOtherItem}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.otherItems.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleOtherItemChange(index, 'name', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={item.storeId || ''}
                    onChange={(e) => handleOtherItemChange(index, 'storeId', e.target.value)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any Store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveOtherItem(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
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
              {mealPlan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
