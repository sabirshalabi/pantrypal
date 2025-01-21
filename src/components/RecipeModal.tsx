import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Clock, Plus, Save, Bot } from 'lucide-react';
import { create } from 'zustand';
import { generateRecipe } from '../services/groq';
import { saveRecipe } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { generateRecipeImage } from '../services/imageService';
import { Disclosure, DisclosureTrigger, DisclosureContent } from './ui/Disclosure';

interface Ingredient {
  id: string;
  name: string;
}

interface Recipe {
  id: string;
  title: string;
  cookingTime: number;
  prepingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  matchPercentage: number;
  instructions: string[];
  ingredients: string[];
}

interface RecipeModalStore {
  ingredients: Ingredient[];
  mealType: string | null;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  setMealType: (type: string) => void;
}

const useRecipeStore = create<RecipeModalStore>((set) => ({
  ingredients: [],
  mealType: null,
  addIngredient: (ingredient) => 
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  removeIngredient: (id) =>
    set((state) => ({ 
      ingredients: state.ingredients.filter((ing) => ing.id !== id) 
    })),
  setMealType: (type) => set({ mealType: type }),
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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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
      const recipePromises = Array(3).fill(null).map(() => 
        generateRecipe({
          ingredients: store.ingredients.map((i) => i.name),
          mealType: store.mealType,
        })
      );

      const results = await Promise.all(recipePromises);
      const allRecipes = results.flat().map((recipe, index) => ({
        ...recipe,
        id: `${index}`, // Ensure unique IDs
      }));

      setRecipes(allRecipes);
    } catch (err) {
      console.error('Error generating recipes:', err);
      setError('Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) return;

    setSaving(prev => ({ ...prev, [recipe.id]: true }));
    try {
      let imageUrl = undefined;
      console.log('Starting recipe save process:', recipe);
      
      // Check if this is a generated recipe (it won't have a sourceUrl yet)
      const isGeneratedRecipe = !recipe.sourceUrl && recipe.matchPercentage !== undefined;
      console.log('Is this a generated recipe?', isGeneratedRecipe);
      
      if (isGeneratedRecipe) {
        console.log('Attempting to generate image for AI recipe');
        try {
          imageUrl = await generateRecipeImage({
            title: recipe.title,
            ingredients: recipe.ingredients,
            mealType: 'main dish'
          });
          console.log('Successfully generated image:', imageUrl);
        } catch (error) {
          console.error('Failed to generate image:', error);
        }
      } else {
        console.log('Not an AI-generated recipe, skipping image generation');
      }

      const recipeToSave = {
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: `PT${recipe.prepingTime}M`,
        cookTime: `PT${recipe.cookingTime}M`,
        userId: user.uid,
        sourceUrl: isGeneratedRecipe ? 'Generated with PantryPal AI' : recipe.sourceUrl,
        ...(imageUrl && { imageUrl })
      };
      
      console.log('Saving recipe with data:', recipeToSave);
      const recipeId = await saveRecipe(recipeToSave);
      setIsOpen(false);
      navigate(`/recipes/${recipeId}`);
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(prev => ({ ...prev, [recipe.id]: false }));
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
                  <p className="text-gray-600">Crafting your recipes...</p>
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
              ) : recipes.length > 0 ? (
                <div className="grid gap-4">
                  {recipes.map((recipe) => (
                    <div key={recipe.id} className="p-4 bg-white rounded-lg shadow">
                      <Disclosure>
                        <DisclosureTrigger>
                          <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                            <h3 className="text-lg font-semibold">{recipe.title}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveRecipe(recipe);
                              }}
                              disabled={saving[recipe.id]}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-500"
                            >
                              {saving[recipe.id] ? (
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
                                {saving[recipe.id] ? 'Generating Image...' : 'Save'}
                              </span>
                            </button>
                          </div>
                        </DisclosureTrigger>
                        <DisclosureContent>
                          <div className="mt-4">
                            <div className="flex gap-4 text-gray-600 text-sm mb-4">
                              <div className="flex flex-col items-center">
                                <div className="flex items-center mb-1">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>Prep:</span>
                                </div>
                                <span>{recipe.prepingTime} mins</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="flex items-center mb-1">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>Cook:</span>
                                </div>
                                <span>{recipe.cookingTime} mins</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="flex items-center mb-1">
                                  <Bot className="w-4 h-4 mr-1" />
                                  <span>Match:</span>
                                </div>
                                <span>{recipe.matchPercentage}%</span>
                              </div>
                            </div>

                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Ingredients:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {recipe.ingredients.map((ingredient, index) => (
                                  <li key={index}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Instructions:</h4>
                              <ol className="list-decimal list-inside space-y-2">
                                {recipe.instructions.map((instruction, index) => (
                                  <li key={index} className="leading-relaxed">
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
