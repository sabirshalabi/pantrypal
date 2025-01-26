import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Plus, CookingPot, ImageIcon, BookOpen } from 'lucide-react';
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
      <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
      <p className="text-gray-500 mb-6">
        Start building your recipe collection!
      </p>
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
        className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        <div className="relative h-48 rounded-t-lg overflow-hidden bg-gray-100">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {recipe.difficulty && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-xs font-medium text-gray-700 shadow-sm">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="capitalize">{recipe.difficulty}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {recipe.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
            {(recipe.prepTime || recipe.cookTime) && (
              <div className="flex items-center gap-3">
                {recipe.prepTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Prep {formatDuration(recipe.prepTime)}</span>
                  </div>
                )}
                {recipe.cookTime && (
                  <div className="flex items-center gap-1">
                    <CookingPot className="h-4 w-4 text-gray-400" />
                    <span>Cook {formatDuration(recipe.cookTime)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Recipes</h2>
          <div className="flex gap-4">
            <Link
              to="/recipes/import"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Add Recipe</span>
              <Plus className="h-5 w-5" />
            </Link>
          </div>
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
    </div>
  );
}
