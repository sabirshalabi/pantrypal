import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Clock, Plus, Save, Bot } from 'lucide-react';
import { create } from 'zustand';
import { generateRecipe, saveRecipe, type Recipe, type RecipeFilters, type RecipeIngredient } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { generateRecipeImage } from '../services/imageService';
import { Disclosure, DisclosureTrigger, DisclosureContent } from './ui/Disclosure';

interface Ingredient {
  id: string;
  name: string;
}

interface GeneratedRecipe extends Recipe {
  tempId: string;
}

interface RecipeModalStore {
  ingredients: Ingredient[];
  mealType: string | null;
  dietary: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  setMealType: (type: string) => void;
  setDietary: (restrictions: string[]) => void;
  setDifficulty: (level: 'beginner' | 'intermediate' | 'advanced' | null) => void;
}

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Low-Carb',
  'Keto'
];

const difficultyLevels: Array<'beginner' | 'intermediate' | 'advanced'> = [
  'beginner',
  'intermediate',
  'advanced'
];

const useRecipeStore = create<RecipeModalStore>((set) => ({
  ingredients: [],
  mealType: null,
  dietary: [],
  difficulty: null,
  addIngredient: (ingredient) => 
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  removeIngredient: (id) =>
    set((state) => ({ 
      ingredients: state.ingredients.filter((ing) => ing.id !== id) 
    })),
  setMealType: (type) => set({ mealType: type }),
  setDietary: (restrictions) => set({ dietary: restrictions }),
  setDifficulty: (level) => set({ difficulty: level })
}));

const mealTypes = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snacks',
  'Beverages',
];

export const RecipeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});
  const store = useRecipeStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAddIngredient = () => {
    if (inputValue.trim()) {
      store.addIngredient({
        id: Math.random().toString(36).substr(2, 9),
        name: inputValue.trim()
      });
      setInputValue('');
    }
  };

  const handleGenerateRecipe = async () => {
    if (store.ingredients.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const filters: RecipeFilters = {
        ingredients: store.ingredients.map(i => i.name),
        dietary: store.dietary,
        difficulty: store.difficulty || undefined
      };

      const generatedRecipe = await generateRecipe(filters);
      
      // Add temporary ID for UI handling
      const recipeWithId = {
        ...generatedRecipe,
        tempId: Math.random().toString(36).substr(2, 9)
      };

      setGeneratedRecipes([recipeWithId]);
    } catch (err) {
      console.error('Error generating recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: Recipe & { tempId: string }) => {
    if (!user) return;

    setSaving(prev => ({ ...prev, [recipe.tempId]: true }));
    try {
      let imageUrl = undefined;
      
      try {
        imageUrl = await generateRecipeImage({
          title: recipe.title,
          ingredients: Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.map(ing => 
                typeof ing === 'string' ? ing : `${ing.amount} ${ing.item}`
              )
            : [],
          mealType: store.mealType || 'main dish'
        });
      } catch (error) {
        console.error('Failed to generate image:', error);
      }

      const recipeToSave = {
        ...recipe,
        userId: user.uid,
        imageUrl
      };
      
      const recipeId = await saveRecipe(recipeToSave);
      setIsOpen(false);
      navigate(`/recipes/${recipeId}`);
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(prev => ({ ...prev, [recipe.tempId]: false }));
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Generate Recipe
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Recipe</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-gray-100 p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Ingredient Input */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
                    placeholder="Add ingredients..."
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddIngredient}
                    className="bg-blue-500 text-white px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {store.ingredients.map((ing) => (
                    <motion.span
                      key={ing.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-blue-100 px-3 py-1 rounded-full flex items-center"
                    >
                      {ing.name}
                      <button 
                        onClick={() => store.removeIngredient(ing.id)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Dietary Restrictions</h3>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        const isSelected = store.dietary.includes(option);
                        store.setDietary(
                          isSelected
                            ? store.dietary.filter(d => d !== option)
                            : [...store.dietary, option]
                        );
                      }}
                      className={`px-3 py-1 rounded-full border transition-colors ${
                        store.dietary.includes(option)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Difficulty Level</h3>
                <div className="flex gap-3">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => store.setDifficulty(level)}
                      className={`px-4 py-2 rounded-md border transition-colors ${
                        store.difficulty === level
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Type Selection */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {mealTypes.map((type) => (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => store.setMealType(type)}
                    className={`p-4 rounded-lg border ${
                      store.mealType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    {type}
                  </motion.button>
                ))}
              </div>

              {/* Generated Recipes */}
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="mb-4"
                  >
                    <ChefHat className="w-12 h-12 text-blue-500" />
                  </motion.div>
                  <p className="text-gray-600">Crafting your recipe...</p>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={handleGenerateRecipe}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : generatedRecipes.length > 0 ? (
                <div className="grid gap-4">
                  {generatedRecipes.map((recipe) => (
                    <div key={recipe.tempId} className="p-4 bg-white rounded-lg shadow">
                      <Disclosure>
                        <DisclosureTrigger>
                          <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                            <h3 className="text-lg font-semibold">{recipe.title}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveRecipe(recipe);
                              }}
                              disabled={saving[recipe.tempId]}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-500"
                            >
                              {saving[recipe.tempId] ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                  className="mr-2"
                                >
                                  <ChefHat className="h-5 w-5" />
                                </motion.div>
                              ) : (
                                <Save className="h-5 w-5 mr-2" />
                              )}
                              <span>
                                {saving[recipe.tempId] ? 'Generating Image...' : 'Save'}
                              </span>
                            </button>
                          </div>
                        </DisclosureTrigger>
                        <DisclosureContent>
                          <div className="mt-4">
                            {recipe.description && (
                              <p className="text-gray-600 mb-4">{recipe.description}</p>
                            )}

                            <div className="grid grid-cols-3 gap-4 mb-4">
                              {recipe.prepTime && (
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center mb-1">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span>Prep:</span>
                                  </div>
                                  <span>{recipe.prepTime}</span>
                                </div>
                              )}
                              {recipe.cookTime && (
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center mb-1">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span>Cook:</span>
                                  </div>
                                  <span>{recipe.cookTime}</span>
                                </div>
                              )}
                              {recipe.difficulty && (
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center mb-1">
                                    <ChefHat className="w-4 h-4 mr-1" />
                                    <span>Difficulty:</span>
                                  </div>
                                  <span className={
                                    recipe.difficulty === 'advanced' ? 'text-red-600' :
                                    recipe.difficulty === 'intermediate' ? 'text-yellow-600' :
                                    'text-green-600'
                                  }>{recipe.difficulty}</span>
                                </div>
                              )}
                            </div>

                            {recipe.nutrition && (
                              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <h4 className="font-medium mb-2">Nutrition Facts</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Calories:</span>{' '}
                                    {recipe.nutrition.calories}
                                  </div>
                                  <div>
                                    <span className="font-medium">Protein:</span>{' '}
                                    {recipe.nutrition.protein}g
                                  </div>
                                  <div>
                                    <span className="font-medium">Carbs:</span>{' '}
                                    {recipe.nutrition.carbs}g
                                  </div>
                                </div>
                                {recipe.nutrition.disclaimer && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    {recipe.nutrition.disclaimer}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Ingredients:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {recipe.ingredients.map((ingredient: string | RecipeIngredient, i: number) => (
                                  <li key={i}>
                                    {typeof ingredient === 'string'
                                      ? ingredient
                                      : `${ingredient.amount} ${ingredient.item}`}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Instructions:</h4>
                              <ol className="list-decimal list-inside space-y-2">
                                {recipe.instructions.map((instruction: string, i: number) => (
                                  <li key={i} className="leading-relaxed">
                                    {instruction}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </DisclosureContent>
                      </Disclosure>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-gray-600">No recipes generated yet.</p>
                </div>
              )}

              <button
                onClick={handleGenerateRecipe}
                disabled={!store.mealType || store.ingredients.length === 0}
                className="w-full mt-6 bg-blue-500 text-white py-2 rounded-lg
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  hover:bg-blue-600 transition-colors"
              >
                Generate Recipe
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RecipeModal;
