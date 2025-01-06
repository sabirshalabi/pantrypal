import React, { useState, useEffect } from 'react';
import { Plus, Star, StarOff, Edit2, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Meal, MealPlan } from '../types/Meal';
import { Store } from '../types/Store';
import { MealModal } from '../components/MealModal';
import { MealPlanModal } from '../components/MealPlanModal';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

export function MealPlanning() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | undefined>();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch meals
    const mealsRef = ref(database, `meals/${user.uid}`);
    const unsubscribeMeals = onValue(mealsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const mealsArray = Object.entries(data).map(([id, meal]: [string, any]) => ({
          ...meal,
          id
        }));
        setMeals(mealsArray);
      } else {
        setMeals([]);
      }
    });

    // Fetch meal plans
    const plansRef = ref(database, `mealPlans/${user.uid}`);
    const unsubscribePlans = onValue(plansRef, (snapshot) => {
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

    // Fetch stores
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
      unsubscribeMeals();
      unsubscribePlans();
      unsubscribeStores();
    };
  }, [user]);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this meal?')) return;

    try {
      await remove(ref(database, `meals/${user.uid}/${mealId}`));
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal. Please try again.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this meal plan?')) return;

    try {
      await remove(ref(database, `mealPlans/${user.uid}/${planId}`));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      alert('Failed to delete meal plan. Please try again.');
    }
  };

  const getCurrentWeekPlan = () => {
    const weekStart = startOfWeek(currentWeek).getTime();
    const weekEnd = endOfWeek(currentWeek).getTime();
    
    return mealPlans.find(plan => 
      plan.startDate >= weekStart && plan.startDate <= weekEnd
    );
  };

  const currentPlan = getCurrentWeekPlan();

  return (
    <div className="space-y-8">
      {/* Weekly Plan Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold">
              Week of {format(startOfWeek(currentWeek), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedPlan(currentPlan);
              setIsPlanModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {currentPlan ? 'Update' : 'Plan This Week'}
          </button>
        </div>

        {currentPlan ? (
          <div className="space-y-6">
            {/* Daily Meals */}
            <div className="grid gap-4">
              {(currentPlan.meals || []).map((dailyMeal) => (
                <div key={dailyMeal.id} className="flex items-center space-x-4 py-2 border-b border-gray-100">
                  <div className="w-32 font-medium">
                    {format(new Date(dailyMeal.date), 'EEEE')}
                  </div>
                  <div className="flex-1">
                    {dailyMeal.mealName || 'No meal planned'}
                  </div>
                </div>
              ))}
            </div>

            {/* Other Items */}
            {currentPlan.otherItems?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Other Items</h3>
                <div className="grid gap-2">
                  {(currentPlan.otherItems || []).map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        readOnly
                      />
                      <span className={item.completed ? 'line-through text-gray-500' : ''}>
                        {item.name}
                      </span>
                      {item.storeId && (
                        <span className="text-sm text-gray-500">
                          {stores.find(s => s.id === item.storeId)?.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No meal plan for this week. Click "Plan This Week" to create one.
          </div>
        )}
      </div>

      {/* Meals Library Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Meals Library</h2>
          <button
            onClick={() => {
              setSelectedMeal(undefined);
              setIsMealModalOpen(true);
            }}
            className="bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-24">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMeal(meal);
                      setIsMealModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => {/* Toggle favorite */}}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    {meal.favorite ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
                  </button>
                </div>
              </div>
              {meal.ingredients?.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Ingredients:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(meal.ingredients || []).map((ingredient) => (
                      <li key={ingredient.id} className="flex items-center justify-between">
                        <span>{ingredient.name}</span>
                        {ingredient.storeId && (
                          <span className="text-xs text-gray-500">
                            {stores.find(s => s.id === ingredient.storeId)?.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {meals.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No meals added yet. Add your first meal to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MealModal
        isOpen={isMealModalOpen}
        onClose={() => {
          setIsMealModalOpen(false);
          setSelectedMeal(undefined);
        }}
        meal={selectedMeal}
        stores={stores}
      />

      <MealPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedPlan(undefined);
        }}
        mealPlan={selectedPlan}
        meals={meals}
        stores={stores}
      />
    </div>
  );
}
