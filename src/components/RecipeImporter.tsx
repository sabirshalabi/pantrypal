import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChefHat, Clock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { saveRecipe, scrapeRecipe, generateRecipe, type Recipe, type RecipeFilters } from '../services/recipeService';
import { generateRecipeImage } from '../services/imageService';
import { useAuth } from '../hooks/useAuth';
import { create } from 'zustand';
import { Switch } from './ui/switch';

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
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  setMealType: (type: string) => void;
  setDifficulty: (level: 'beginner' | 'intermediate' | 'advanced' | null) => void;
}

const difficultyLevels: Array<'beginner' | 'intermediate' | 'advanced'> = [
  'beginner',
  'intermediate',
  'advanced'
];

const mealTypes = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snacks',
  'Beverages',
];

const useRecipeStore = create<RecipeModalStore>((set) => ({
  ingredients: [],
  mealType: null,
  difficulty: null,
  addIngredient: (ingredient) => 
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  removeIngredient: (id) =>
    set((state) => ({ 
      ingredients: state.ingredients.filter((ing) => ing.id !== id) 
    })),
  setMealType: (type) => set({ mealType: type }),
  setDifficulty: (level) => set({ difficulty: level })
}));

export function RecipeImporter() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
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

  const handleSaveRecipe = async (recipe: GeneratedRecipe) => {
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
      navigate(`/recipes/${recipeId}`);
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(prev => ({ ...prev, [recipe.tempId]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecipe(null);
try {
  const scrapedRecipe = await scrapeRecipe(url, useLLM);
  setRecipe(scrapedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!recipe || !user) return;
    
    try {
      const recipeWithUser = {
        title: recipe.title,
        description: recipe.description || undefined,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime || null,
        cookTime: recipe.cookTime || null,
        servings: recipe.servings || undefined,
        imageUrl: recipe.imageUrl || undefined,
        sourceUrl: url,
        userId: user.uid,
        difficulty: recipe.difficulty || undefined,
        nutrition: recipe.nutrition || undefined,
        metadata: recipe.metadata || {
          source: 'web-import',
          generatedAt: new Date().toISOString(),
          basedOn: [url],
          filters: { ingredients: [] }
        }
      };
      
      const recipeId = await saveRecipe(recipeWithUser);
      navigate(`/recipes/${recipeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex gap-4 mb-6">
        <button
          className={`flex-1 px-4 py-2 text-center rounded-t-lg border-b-2 ${
            !showGenerator ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300'
          }`}
          onClick={() => setShowGenerator(false)}
        >
          Import from URL
        </button>
        <button
          className={`flex-1 px-4 py-2 text-center rounded-t-lg border-b-2 ${
            showGenerator ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300'
          }`}
          onClick={() => setShowGenerator(true)}
        >
          Generate Recipe
        </button>
      </div>

      {!showGenerator ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">Recipe URL</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a recipe URL (e.g., foodnetwork.com/recipes/...)"
                className="flex-1"
                required
              />
              <Button type="submit" disabled={loading} variant="default">
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="animate-spin mr-2" size={18} />
                    {useLLM ? 'Processing...' : 'Importing...'}
                  </span>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
            <div className="mt-3 flex items-center">
              <Switch 
                isSelected={useLLM}
                onChange={setUseLLM}
                className="text-sm text-gray-600"
              >
                Use AI?{' '}
                <span className="ml-1 text-gray-400">(recommended)</span>
              </Switch>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Ingredient Input */}
          <div>
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
                <span
                  key={ing.id}
                  className="bg-blue-100 px-3 py-1 rounded-full flex items-center"
                >
                  {ing.name}
                  <button 
                    onClick={() => store.removeIngredient(ing.id)}
                    className="ml-2 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <h3 className="font-medium mb-2">Difficulty Level</h3>
            <div className="flex flex-wrap gap-2">
              {difficultyLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => store.setDifficulty(level)}
                  className={`px-4 py-2 rounded-lg border ${
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {mealTypes.map((type) => (
              <button
                key={type}
                onClick={() => store.setMealType(type)}
                className={`p-4 text-center rounded-lg border ${
                  store.mealType === type
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Generated Recipes */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="mb-4">
                <ChefHat className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
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
                  <h3 className="text-lg font-semibold mb-4">{recipe.title}</h3>
                  <div className="space-y-4">
                    {recipe.description && (
                      <p className="text-gray-600">{recipe.description}</p>
                    )}

                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="bg-gray-50 p-4 rounded-lg">
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

                    <div>
                      <h4 className="font-medium mb-2">Ingredients:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {recipe.ingredients.map((ingredient, i) => (
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
                        {recipe.instructions.map((instruction, i) => (
                          <li key={i} className="leading-relaxed">
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <button
                      onClick={() => handleSaveRecipe(recipe)}
                      disabled={saving[recipe.tempId] || !user}
                      className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving[recipe.tempId] ? (
                        <>
                          <ChefHat className="h-5 w-5 animate-spin" />
                          <span>Generating Image...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>{!user ? 'Sign in to save recipe' : 'Save Recipe'}</span>
                        </>
                      )}
                    </button>
                  </div>
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
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-100 text-red-700 rounded-md"
        >
          {error}
        </motion.div>
      )}

      {recipe && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 space-y-4"
        >
          <h3 className="text-xl font-semibold">{recipe.title}</h3>
          
          {recipe.imageUrl && (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full rounded-lg"
            />
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {recipe.prepTime && (
              <div>
                <span className="font-medium">Prep Time:</span> {recipe.prepTime}
              </div>
            )}
            {recipe.cookTime && (
              <div>
                <span className="font-medium">Cook Time:</span> {recipe.cookTime}
              </div>
            )}
            {recipe.servings && (
              <div>
                <span className="font-medium">Servings:</span> {recipe.servings}
              </div>
            )}
            {recipe.difficulty && (
              <div>
                <span className="font-medium">Difficulty:</span>{' '}
                <span className={`capitalize ${
                  recipe.difficulty === 'advanced' ? 'text-red-600' :
                  recipe.difficulty === 'intermediate' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {recipe.difficulty}
                </span>
              </div>
            )}
          </div>

          {recipe.nutrition && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Nutritional Information</h4>
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

          {recipe.description && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Description:</h4>
              <p className="text-gray-700">{recipe.description}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Ingredients:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>
                  {typeof ingredient === 'string'
                    ? ingredient
                    : `${ingredient.amount} ${ingredient.item}`}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Instructions:</h4>
            <ol className="list-decimal pl-5 space-y-2">
              {recipe.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>

          <button
            onClick={handleSave}
            disabled={!user}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {!user ? 'Sign in to save recipe' : 'Save Recipe'}
          </button>
        </motion.div>
      )}

    </div>
  );
}


git commit 