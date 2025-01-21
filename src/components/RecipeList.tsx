import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Plus, CookingPot, ImageIcon } from 'lucide-react';
import type { Recipe } from '../services/recipeService';
import { getUserRecipes } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import { formatDuration } from '../utils/timeUtils';

export function RecipeList() {
  const [recipes, setRecipes] = useState<(Recipe & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadRecipes() {
      if (!user) return;
      
      try {
        const userRecipes = await getUserRecipes(user.uid);
        setRecipes(userRecipes);
      } catch (err) {
        console.error('Error loading recipes:', err);
        // If there's an error, we'll just show an empty state
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">
        <CookingPot className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes yet</h3>
      <p className="text-gray-500 mb-6">Start building your recipe collection!</p>
      <Link
        to="/recipes/import"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus className="h-5 w-5 mr-2" />
        Import Your First Recipe
      </Link>
    </div>
  );

  function RecipeCard({ recipe }: { recipe: Recipe & { id: string } }) {
    return (
      <Link
        to={`/recipes/${recipe.id}`}
        className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="relative h-48 rounded-t-lg overflow-hidden bg-gray-100">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{recipe.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {recipe.prepTime && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Prep: {formatDuration(recipe.prepTime)}</span>
              </div>
            )}
            {recipe.cookTime && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Cook: {formatDuration(recipe.cookTime)}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{recipe.servings}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Recipes</h2>
        <Link
          to="/recipes/import"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <RecipeCard recipe={recipe} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
