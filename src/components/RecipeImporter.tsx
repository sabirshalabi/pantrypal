import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveRecipe, scrapeRecipe } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import type { Recipe } from '../services/recipeService';
import { RecipeModal } from './RecipeModal';

export function RecipeImporter() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

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
        servings: recipe.servings || null,
        imageUrl: recipe.imageUrl || null,
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
      <h2 className="text-2xl font-bold mb-4">Add Recipe</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-1">
            Recipe URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe"
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <label htmlFor="scraping-toggle" className="text-sm font-medium text-gray-700">
            Use AI-Powered Scraping
          </label>
          <button
            type="button"
            role="switch"
            id="scraping-toggle"
            aria-checked={useLLM}
            onClick={() => setUseLLM(!useLLM)}
            className={`${useLLM ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span className="sr-only">Use AI-Powered Scraping</span>
            <span
              className={`${useLLM ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={18} />
              {useLLM ? 'Processing with AI...' : 'Importing...'}
            </span>
          ) : (
            'Import Recipe'
          )}
        </button>
      </form>

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

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Or Generate a Recipe</h2>
        <p className="text-gray-600 mb-4">
          Don't have a recipe URL? Generate a recipe based on your available ingredients!
        </p>
        <RecipeModal />
      </div>
    </div>
  );
}
