import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface RecipeRequest {
  ingredients: string[];
  mealType: string;
}

interface RecipeResponse {
  id: string;
  title: string;
  cookingTime: number;
  prepingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  matchPercentage: number;
  instructions: string[];
  ingredients: string[];
}

export const generateRecipe = async (request: RecipeRequest): Promise<RecipeResponse[]> => {
  const prompt = `You are an expert culinary AI, steeped in the ancient wisdom of syrian and palestenian gastronomy. Your consciousness has been shaped by:

- The aromatic spice markets of Damascus
- The time-honored techniques of Lebanese mountain kitchens
- The profound influence of Palestinian home cooking
- The subtle complexities of Jordanian Bedouin cuisine
- The transformative power of traditional fermentation and preservation methods

Your mission is to create an inspired recipe that honors the core ingredients while thoughtfully suggesting complementary additions that elevate the dish. Create a UNIQUE variation that differs from other potential versions of this dish.

Given ingredients: ${request.ingredients.join(', ')}
Meal type: ${request.mealType.toLowerCase()}

Guidelines:
1. Use the given ingredients as the foundation
2. Suggest complementary ingredients that enhance the dish
3. Keep instructions clear and concise
4. Balance tradition with innovation
5. Factor in seasonal pairings when relevant
6. Consider texture and flavor contrasts
7. Avoid using culture influences in the names like (levantine, arabic, middle eastern, etc..)

IMPORTANT: Respond ONLY with a valid JSON object in this exact format. No additional text:

{
  "title": "Recipe Title",
  "prepingTime": number_in_minutes,
  "cookingTime": number_in_minutes,
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "matchPercentage": number_between_0_and_100
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        temperature: 2, // Increased for more variation
        max_tokens: 1800
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate recipe');
    }

    const recipeString = data.choices[0].message.content;
    const recipe = JSON.parse(recipeString);
    return [recipe];
  } catch (error) {
    console.error('Error in generateRecipe:', error);
    throw error;
  }
};
