import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveRecipe } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import type { Recipe } from '../services/recipeService';

export function RecipeImporter() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import recipe');
      }

      const data = await response.json();
      setRecipe(data);
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
        ...recipe,
        userId: user.uid,
        sourceUrl: url
      };
      
      const recipeId = await saveRecipe(recipeWithUser);
      navigate(`/recipes/${recipeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Import Recipe</h2>
      
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
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={18} />
              Importing...
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
          </div>

          <div>
            <h4 className="font-medium mb-2">Ingredients:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
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
