import { database } from '../lib/firebase';
import { 
  ref, 
  push,
  get,
  remove,
  serverTimestamp,
  set
} from 'firebase/database';

// Get base URL for API endpoints
const API_BASE_URL = import.meta.env.PROD
  ? 'https://pantrypal-liard.vercel.app'
  : 'http://localhost:3001';

export interface RecipeIngredient {
  item: string;
  amount: string;
}

export interface Recipe {
  title: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: string | null;
  cookTime: string | null;
  servings?: number;
  imageUrl?: string;
  sourceUrl?: string;
  userId: string;
  createdAt?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    disclaimer: string;
  };
  metadata?: {
    source: string;
    generatedAt: string;
    basedOn: string[];
    filters: RecipeFilters;
  };
}

export interface RecipeFilters {
  ingredients: string[];
  dietary?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxTime?: number;
}

// Helper function to convert ingredients to structured format
export function structureIngredients(ingredients: (string | RecipeIngredient)[]): RecipeIngredient[] {
  return ingredients.map(ingredient => {
    if (typeof ingredient === 'string') {
      const match = ingredient.match(/^([\d./\s]+(?:\s*[a-zA-Z]+)?)\s+(.+)$/);
      return match
        ? { amount: match[1].trim(), item: match[2].trim() }
        : { amount: '', item: ingredient.trim() };
    }
    return ingredient as RecipeIngredient;
  });
}

export async function saveRecipe(recipe: Omit<Recipe, 'createdAt'>) {
  try {
    const recipesRef = ref(database, 'recipes');
    const newRecipeRef = push(recipesRef);
    
    console.log('Input recipe:', recipe); // Debug log
    
    // Convert undefined values to null and ensure required fields exist
    const recipeData = {
      title: recipe.title,
      ingredients: structureIngredients(recipe.ingredients),
      instructions: recipe.instructions,
      userId: recipe.userId,
      sourceUrl: recipe.sourceUrl || 'Generated with PantryPal AI',
      createdAt: serverTimestamp(),
      // Optional fields - preserve original values or use null
      description: recipe.description || null,
      difficulty: recipe.difficulty || null,
      prepTime: recipe.prepTime || null,  // Preserve original prepTime
      cookTime: recipe.cookTime || null,  // Preserve original cookTime
      servings: recipe.servings || null,
      imageUrl: recipe.imageUrl || null,
      nutrition: recipe.nutrition ? {
        calories: recipe.nutrition.calories || 0,
        protein: recipe.nutrition.protein || 0,
        carbs: recipe.nutrition.carbs || 0,
        disclaimer: recipe.nutrition.disclaimer || ''
      } : null,
      metadata: {
        source: recipe.metadata?.source || 'AI-generated',
        generatedAt: recipe.metadata?.generatedAt || new Date().toISOString(),
        basedOn: recipe.metadata?.basedOn || [],
        filters: recipe.metadata?.filters || { ingredients: [] }
      }
    };

    console.log('Recipe data to save:', recipeData); // Debug log

    // Validate required fields
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions || !recipeData.userId) {
      throw new Error('Missing required recipe fields');
    }

    await set(newRecipeRef, recipeData);
    return newRecipeRef.key;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error instanceof Error ? error : new Error('Failed to save recipe');
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
        console.log('Raw recipe from Firebase:', childSnapshot.key, recipe); // Debug log
        
        if (recipe.userId === userId) {
          const processedRecipe = {
            id: childSnapshot.key!,
            ...recipe,
            prepTime: recipe.prepTime || null,  // Ensure time fields are preserved
            cookTime: recipe.cookTime || null
          };
          console.log('Processed recipe:', processedRecipe); // Debug log
          recipes.push(processedRecipe);
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

export async function generateRecipe(filters: RecipeFilters): Promise<Recipe> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Log the full error response for debugging
      console.error('API Error Response:', data);
      throw new Error(data.error || 'Failed to generate recipe');
    }

    // Validate required fields
    if (!data.title || !data.ingredients || !data.instructions) {
      console.error('Invalid recipe data:', data);
      throw new Error('Generated recipe data is missing required fields');
    }
    
    // Ensure the response matches our Recipe interface
    const recipe: Recipe = {
      ...data,
      // Ensure ingredients are in structured format
      ingredients: Array.isArray(data.ingredients)
        ? structureIngredients(data.ingredients)
        : [],
      userId: '', // This will be set when saving to Firebase
      createdAt: Date.now(),
      sourceUrl: data.sourceUrl || 'Generated with PantryPal AI'
    };

    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Generated recipe data is incomplete');
    }

    return recipe;
  } catch (error) {
    console.error('Error generating recipe:', error);
    throw error instanceof Error ? error : new Error('An unexpected error occurred while generating the recipe');
  }
}

export async function scrapeRecipe(url: string, useLLM: boolean = false): Promise<Recipe> {
  try {
    const endpoint = useLLM ? 'api/scrape-recipe-llm' : 'api/scrape-recipe';
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || `Failed to scrape recipe using ${useLLM ? 'LLM' : 'standard'} method`
      );
    }

    const data = await response.json();
    
    if (!data.title || !data.ingredients || !data.instructions) {
      throw new Error('Scraped recipe data is incomplete');
    }

    // Extract and normalize time data
    const prepTime = data.prepTime || data.prep_time || data.preparationTime || null;
    const cookTime = data.cookTime || data.cook_time || data.cookingTime || null;

    // Construct a properly typed Recipe object
    const recipe: Recipe = {
      title: data.title,
      description: data.description || null,
      ingredients: Array.isArray(data.ingredients)
        ? structureIngredients(data.ingredients)
        : [],
      instructions: Array.isArray(data.instructions)
        ? data.instructions
        : [],
      prepTime,
      cookTime,
      servings: data.servings || null,
      imageUrl: data.imageUrl || null,
      sourceUrl: url,
      userId: '', // Will be set when saving
      difficulty: data.difficulty || null,
      nutrition: data.nutrition || null,
      metadata: {
        source: 'web-import',
        generatedAt: new Date().toISOString(),
        basedOn: [url],
        filters: { ingredients: [] }
      }
    };

    return recipe;
  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw error instanceof Error ? error : new Error('An unexpected error occurred while scraping the recipe');
  }
}