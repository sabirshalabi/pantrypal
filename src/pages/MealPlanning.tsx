import React, { useState, useEffect } from 'react';
import { Plus, Star, StarOff, Edit2, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Meal, MealPlan } from '../types/Meal';
import { Store } from '../types/Store';
import { MealModal } from '../components/MealModal';
import { MealPlanModal } from '../components/MealPlanModal';
import { Button } from '../components/ui/button';
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
          <div className="inline-flex items-center bg-gray-50 rounded-lg p-1">
            <Button
              onClick={handlePreviousWeek}
              variant="ghost"
              size="icon"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-3 font-medium">
              {format(startOfWeek(currentWeek), 'MMM d')}
            </div>
            <Button
              onClick={handleNextWeek}
              variant="ghost"
              size="icon"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          <Button
            onClick={() => {
              setSelectedPlan(currentPlan);
              setIsPlanModalOpen(true);
            }}
            variant="default"
          >
            {currentPlan ? 'Update' : 'Plan This Week'}
          </Button>
        </div>

        {currentPlan ? (
          <div className="space-y-6">
            {/* Daily Meals */}
            <div className="grid grid-cols-1 gap-2">
              {(currentPlan.meals || []).map((dailyMeal) => (
                <div 
                  key={dailyMeal.id} 
                  className="flex items-center bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-24 font-medium text-gray-600">
                    {format(new Date(dailyMeal.date), 'EEE')}
                  </div>
                  <div className="flex-1 font-medium">
                    {dailyMeal.mealName || (
                      <span className="text-gray-400">No meal planned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Other Items */}
            {currentPlan.otherItems?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Other Items</h3>
                <div className="grid gap-2">
                  {(currentPlan.otherItems || []).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        readOnly
                      />
                      <span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.name}
                      </span>
                      {item.storeId && (
                        <span className="text-sm text-gray-400 bg-white px-2 py-1 rounded">
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
      <div className="px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Meals Library</h2>
          <Button
            onClick={() => {
              setSelectedMeal(undefined);
              setIsMealModalOpen(true);
            }}
            variant="default"
            size="icon"
            aria-label="Add new meal"
          >
            <Plus size={24} />
          </Button>
        </div>

        <div className="space-y-4 mb-24">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium mb-1">{meal.name}</h3>
                  <p className="text-sm text-gray-500">
                    {meal.ingredients?.length || 0} ingredients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setSelectedMeal(meal);
                      setIsMealModalOpen(true);
                    }}
                    variant="ghost"
                    size="icon"
                    aria-label="Edit meal"
                  >
                    <Edit2 size={20} />
                  </Button>
                  <Button
                    onClick={() => handleDeleteMeal(meal.id)}
                    variant="ghost"
                    size="icon"
                    aria-label="Delete meal"
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
              {meal.ingredients?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <ul className="space-y-2">
                    {(meal.ingredients || []).slice(0, 3).map((ingredient) => (
                      <li key={ingredient.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{ingredient.name}</span>
                        {ingredient.storeId && (
                          <span className="text-xs text-gray-500">
                            {stores.find(s => s.id === ingredient.storeId)?.name}
                          </span>
                        )}
                      </li>
                    ))}
                    {(meal.ingredients?.length || 0) > 3 && (
                      <li className="text-sm text-gray-500">
                        +{meal.ingredients!.length - 3} more ingredients
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {meals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No meals added yet. Add your first meal to get started!</p>
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
