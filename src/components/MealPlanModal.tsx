import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, push, set, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { MealPlan, Meal, DailyMeal, MealPlanItem } from '../types/Meal';
import { Store } from '../types/Store';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import toast from 'react-hot-toast';

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlan?: MealPlan;
  meals: Meal[];
  stores: Store[];
  currentWeek?: Date;
}

export function MealPlanModal({ isOpen, onClose, mealPlan, meals, stores = [], currentWeek }: MealPlanModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    startDate: startOfWeek(currentWeek || new Date()).getTime(),
    endDate: addDays(startOfWeek(currentWeek || new Date()), 6).getTime(),
    meals: [] as DailyMeal[],
    otherItems: [] as MealPlanItem[]
  });

  useEffect(() => {
    if (mealPlan) {
      setFormData({
        name: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        meals: mealPlan.meals,
        otherItems: mealPlan.otherItems || []
      });
    } else {
      // Initialize with empty meals for each day of the week
      const startDate = startOfWeek(currentWeek || new Date()).getTime();
      const initialMeals = Array.from({ length: 7 }, (_, i) => ({
        id: Date.now().toString() + i,
        date: addDays(new Date(startDate), i).getTime(),
        mealId: '',
        mealName: ''
      }));

      setFormData({
        name: format(new Date(startDate), "'Week of' MMM d, yyyy"),
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

    const newMeals = [...(formData.meals || [])];
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
        ...(formData.otherItems || []),
        { id: Date.now().toString(), name: '', storeId: undefined, completed: false }
      ]
    });
  };

  const handleRemoveOtherItem = (index: number) => {
    const newItems = [...(formData.otherItems || [])];
    newItems.splice(index, 1);
    setFormData({ ...formData, otherItems: newItems });
  };

  const handleOtherItemChange = (index: number, field: keyof MealPlanItem, value: any) => {
    const newItems = [...(formData.otherItems || [])];
    newItems[index] = { ...(newItems[index] || {}), [field]: value };
    setFormData({ ...formData, otherItems: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const timestamp = Date.now();
      
      // Normalize dates to start of day to ensure consistent timestamps
      const normalizedStartDate = startOfWeek(new Date(formData.startDate), { weekStartsOn: 0 }).getTime();
      const normalizedEndDate = endOfWeek(new Date(formData.startDate), { weekStartsOn: 0 }).getTime();
      
      // Update meals array with normalized dates
      const normalizedMeals = formData.meals.map((meal, index) => ({
        ...meal,
        date: addDays(new Date(normalizedStartDate), index).getTime()
      }));

      if (mealPlan) {
        // Update existing meal plan
        const updateData = {
          name: formData.name,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          meals: normalizedMeals,
          otherItems: formData.otherItems || [],
          updatedAt: timestamp
        };
        await update(ref(database, `mealPlans/${user.uid}/${mealPlan.id}`), updateData);
      } else {
        // Create new meal plan
        const planRef = ref(database, `mealPlans/${user.uid}`);
        const newPlanRef = push(planRef);
        
        const newPlan = {
          id: newPlanRef.key,
          name: formData.name,
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          meals: normalizedMeals,
          otherItems: formData.otherItems || [],
          userId: user.uid,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        await set(newPlanRef, newPlan);
      }
      
      toast.success('Meal plan saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving meal plan:', error);
      toast.error('Failed to save meal plan. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="h-full md:p-4 flex items-center justify-center">
        <div className="bg-white w-full h-full md:h-auto md:rounded-lg md:max-w-4xl md:max-h-[90vh] flex flex-col">
          <form onSubmit={handleSubmit} className="h-full flex flex-col overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 md:p-6 pb-3 md:pb-4 border-b shadow-sm z-10">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-semibold">
                {mealPlan ? 'Edit Meal Plan' : 'Create New Meal Plan'}
              </h2>
            </div>
            
            <div className="flex-1 p-4 md:p-6 pt-3 md:pt-4 space-y-6">
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
                  {(formData.meals || []).map((dailyMeal, index) => (
                    <div key={dailyMeal.id} className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                      <div className="w-full md:w-32">
                        <Calendar size={16} className="inline mr-2 text-gray-500" />
                        {format(new Date(dailyMeal.date), 'EEEE')}
                      </div>
                      <select
                        value={dailyMeal.mealId}
                        onChange={(e) => handleMealChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a meal</option>
                        {(meals || []).map(meal => (
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
                  {(formData.otherItems || []).map((item, index) => (
                    <div key={item.id} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                      <div className="flex flex-1 space-x-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleOtherItemChange(index, 'name', e.target.value)}
                          placeholder="Item name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherItem(index)}
                          className="text-red-500 hover:text-red-600 shrink-0"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <select
                        value={item.storeId || ''}
                        onChange={(e) => handleOtherItemChange(index, 'storeId', e.target.value)}
                        className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Any Store</option>
                        {(stores || []).map(store => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 md:p-6 bg-white flex justify-end space-x-3">
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
    </div>
  );
}
