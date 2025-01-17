import { database } from '../lib/firebase';
import { 
  ref, 
  push,
  get,
  query,
  orderByChild,
  equalTo,
  remove,
  serverTimestamp,
  set
} from 'firebase/database';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://pantrypal-sabirshalabi.vercel.app/api'
  : 'http://localhost:3001/api';

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  imageUrl?: string;
  sourceUrl?: string;
  userId: string;
  createdAt?: number;
}

export async function saveRecipe(recipe: Omit<Recipe, 'createdAt'>) {
  try {
    const recipesRef = ref(database, 'recipes');
    const newRecipeRef = push(recipesRef);
    
    await set(newRecipeRef, {
      ...recipe,
      createdAt: serverTimestamp()
    });
    
    return newRecipeRef.key;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw new Error('Failed to save recipe');
  }
}

export async function getRecipeById(recipeId: string) {
  try {
    const recipeRef = ref(database, `recipes/${recipeId}`);
    const snapshot = await get(recipeRef);
    
    if (snapshot.exists()) {
      return {
        id: recipeId,
        ...snapshot.val()
      } as Recipe & { id: string };
    }
    return null;
  } catch (error) {
    console.error('Error getting recipe:', error);
    throw new Error('Failed to get recipe');
  }
}

export async function getUserRecipes(userId: string) {
  try {
    // Get all recipes and filter client-side
    const recipesRef = ref(database, 'recipes');
    const snapshot = await get(recipesRef);
    const recipes: (Recipe & { id: string })[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const recipe = childSnapshot.val();
        if (recipe.userId === userId) {
          recipes.push({
            id: childSnapshot.key!,
            ...recipe
          });
        }
      });
    }
    
    // Sort by createdAt in descending order
    return recipes.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error getting user recipes:', error);
    // Return empty array instead of throwing
    return [];
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    const recipeRef = ref(database, `recipes/${recipeId}`);
    await remove(recipeRef);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw new Error('Failed to delete recipe');
  }
}

export async function scrapeRecipe(url: string): Promise<Recipe> {
  try {
    const response = await fetch(`${API_BASE_URL}/scrape-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Failed to scrape recipe');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw error;
  }
}
