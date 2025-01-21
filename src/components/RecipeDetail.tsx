import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, ArrowLeft, Globe, Trash2, AlertCircle, BookOpen, Bot, Plus } from 'lucide-react';
import type { Recipe } from '../services/recipeService';
import { getRecipeById, deleteRecipe } from '../services/recipeService';
import { useAuth } from '../hooks/useAuth';
import { MealModal } from './MealModal';
import { database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import type { Store } from '../types/Store';
import { formatDuration } from '../utils/timeUtils';

export function RecipeDetail() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const [recipe, setRecipe] = useState<(Recipe & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Fetch stores
    const storesRef = ref(database, `stores/${user.uid}`);
    const unsubscribe = onValue(storesRef, (snapshot) => {
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

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    async function loadRecipe() {
      if (!recipeId) return;
      
      try {
        const recipeData = await getRecipeById(recipeId);
        if (!recipeData) {
          setError('Recipe not found');
          return;
        }
        
        // Ensure required fields exist
        setRecipe({
          ...recipeData,
          ingredients: recipeData.ingredients || [],
          instructions: recipeData.instructions || []
        });
      } catch (err) {
        setError('Failed to load recipe');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadRecipe();
  }, [recipeId]);

  const handleDelete = async () => {
    if (!recipe || !window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      navigate('/recipes');
    } catch (err) {
      setError('Failed to delete recipe');
      setDeleting(false);
    }
  };

  const handleAddToMeals = () => {
    if (!recipe) return;

    // Filter out any empty ingredients and clean up the text
    const cleanedIngredients = recipe.ingredients
      .filter(ingredient => ingredient.trim().length > 0)
      .map((ingredient, index) => ({
        id: `ingredient-${index}-${Date.now()}`,
        name: ingredient.trim(),
        storeId: undefined
      }));

    setIsMealModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Recipe not found'}
        </h3>
        <button
          onClick={() => navigate('/recipes')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recipes
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/recipes')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            <span>Delete</span>
          </button>
          <button
            onClick={handleAddToMeals}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>Add to Meals</span>
          </button>
        </div>
      </div>

      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-64 object-cover rounded-lg shadow-sm mb-6"
        />
      )}

      <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>

      <div className="flex flex-wrap items-center gap-6 text-gray-500 mb-8">
        {recipe.prepTime && (
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-1" />
            <span>Prep: {formatDuration(recipe.prepTime)}</span>
          </div>
        )}
        {recipe.cookTime && (
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-1" />
            <span>Cook: {formatDuration(recipe.cookTime)}</span>
          </div>
        )}
        {recipe.servings && (
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-1" />
            <span>{recipe.servings} servings</span>
          </div>
        )}
        {recipe.sourceUrl && (
          recipe.sourceUrl === 'Generated with PantryPal AI' ? (
            <div className="flex items-center text-emerald-600">
              <Bot className="h-5 w-5 mr-1" />
              <span>Made with Pal.AI</span>
            </div>
          ) : (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <Globe className="h-5 w-5 mr-1" />
              <span>Source</span>
            </a>
          )
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
          {recipe.ingredients.length > 0 ? (
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mr-3 mt-0.5">
                    •
                  </span>
                  {ingredient}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No ingredients listed</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          {recipe.instructions.length > 0 ? (
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="h-5 w-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-500">No instructions listed</p>
          )}
        </div>
      </div>

      {/* Add MealModal */}
      <MealModal
        isOpen={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        stores={stores}
        meal={{
          id: '',
          name: recipe?.title || '',
          ingredients: recipe?.ingredients
            .filter(ingredient => ingredient.trim().length > 0)
            .map((ingredient, index) => ({
              id: `ingredient-${index}-${Date.now()}`,
              name: ingredient.trim(),
              storeId: undefined
            })) || [],
          favorite: false,
          userId: user?.uid || '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }}
      />
    </motion.div>
  );
}
