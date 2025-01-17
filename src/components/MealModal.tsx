import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, push, update } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { Meal, Ingredient } from '../types/Meal';
import { Store } from '../types/Store';

interface MealModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal?: Meal;
  stores: Store[];
}

export function MealModal({ isOpen, onClose, meal, stores }: MealModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    ingredients: [] as Ingredient[],
    favorite: false
  });

  useEffect(() => {
    if (meal) {
      // Ensure ingredients are properly initialized
      const cleanedIngredients = (meal.ingredients || [])
        .filter(ingredient => ingredient.name.trim().length > 0)
        .map(ingredient => ({
          ...ingredient,
          name: ingredient.name.trim()
        }));

      setFormData({
        name: meal.name || '',
        ingredients: cleanedIngredients,
        favorite: meal.favorite || false
      });
    } else {
      setFormData({
        name: '',
        ingredients: [],
        favorite: false
      });
    }
  }, [meal]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, {
        id: `ingredient-${formData.ingredients.length}-${Date.now()}`,
        name: '',
        storeId: undefined
      }]
    });
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients.splice(index, 1);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { 
      ...newIngredients[index], 
      [field]: field === 'storeId' ? (value || undefined) : value 
    };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const timestamp = Date.now();
      
      // Clean up ingredients data
      const cleanedIngredients = formData.ingredients
        .filter(ingredient => ingredient.name.trim().length > 0)
        .map(ingredient => ({
          ...ingredient,
          name: ingredient.name.trim(),
          storeId: ingredient.storeId || null
        }));

      const cleanedData = {
        ...formData,
        ingredients: cleanedIngredients
      };
      
      if (meal?.id) {
        // Update existing meal
        await update(ref(database, `meals/${user.uid}/${meal.id}`), {
          ...cleanedData,
          updatedAt: timestamp
        });
      } else {
        // Create new meal
        const mealRef = push(ref(database, `meals/${user.uid}`));
        await update(mealRef, {
          ...cleanedData,
          id: mealRef.key,
          userId: user.uid,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">
          {meal?.id ? 'Edit Meal' : 'Add New Meal'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Meal Name
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Ingredients
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add Ingredient
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={ingredient.storeId || ''}
                    onChange={(e) => handleIngredientChange(index, 'storeId', e.target.value)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any Store</option>
                    {stores?.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              {formData.ingredients.length === 0 && (
                <p className="text-gray-500 text-sm italic">No ingredients added yet</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="favorite"
              checked={formData.favorite}
              onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="favorite" className="ml-2 block text-sm text-gray-900">
              Add to Favorites
            </label>
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
              {meal?.id ? 'Save Changes' : 'Add Meal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
