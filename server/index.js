import express from 'express';
import cors from 'cors';
import { load } from 'cheerio';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const app = express();
dotenv.config();

// Common recipe-related terms and patterns
const RECIPE_PATTERNS = {
  ingredients: [
    'ingredients',
    'what you\'ll need',
    'shopping list',
    'you\'ll need',
    'what you need'
  ],
  instructions: [
    'instructions',
    'directions',
    'method',
    'steps',
    'how to make',
    'preparation'
  ],
  measurements: [
    'cup', 'cups',
    'tablespoon', 'tablespoons', 'tbsp',
    'teaspoon', 'teaspoons', 'tsp',
    'pound', 'pounds', 'lb',
    'ounce', 'ounces', 'oz',
    'gram', 'grams', 'g',
    'kilogram', 'kilograms', 'kg',
    'ml', 'milliliter', 'milliliters',
    'liter', 'liters',
    'pinch', 'pinches',
    'dash',
    'to taste'
  ],
  timings: [
    'minutes',
    'mins',
    'hours',
    'hrs',
    'overnight'
  ]
};

async function extractJsonLd(html) {
  const $ = load(html);
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  let recipe = null;
  
  jsonLdScripts.each((_, element) => {
    try {
      const scriptContent = $(element).html();
      if (!scriptContent) return;
      
      const data = JSON.parse(scriptContent);
      if (Array.isArray(data)) {
        recipe = data.find(item => item && item['@type'] === 'Recipe');
      } else if (data && data['@graph']) {
        recipe = data['@graph'].find(item => item && item['@type'] === 'Recipe');
      } else if (data && data['@type'] === 'Recipe') {
        recipe = data;
      }
      if (recipe) return false; // Break the loop if recipe found
    } catch (error) {
      console.error('Error parsing JSON-LD script:', error);
    }
  });
  
  if (!recipe) return null;
  
  return {
    title: recipe.name || '',
    ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
    instructions: Array.isArray(recipe.recipeInstructions) 
      ? recipe.recipeInstructions.map(instruction => 
          typeof instruction === 'string' ? instruction : instruction.text || '')
      : [],
    prepTime: recipe.prepTime || undefined,
    cookTime: recipe.cookTime || undefined,
    servings: recipe.recipeYield ? parseInt(recipe.recipeYield) : undefined,
    imageUrl: recipe.image?.[0] || recipe.image || undefined
  };
}

async function extractMicrodata(html) {
  const $ = load(html);
  const recipe = $('[itemtype*="Recipe"]').first();
  
  if (!recipe.length) return null;
  
  const ingredients = recipe.find('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
    .map((_, el) => $(el).text())
    .get()
    .filter(text => text && typeof text === 'string');

  const instructions = recipe.find('[itemprop="recipeInstructions"]')
    .map((_, el) => $(el).text())
    .get()
    .filter(text => text && typeof text === 'string');
  
  return {
    title: recipe.find('[itemprop="name"]').first().text() || '',
    ingredients,
    instructions,
    prepTime: recipe.find('[itemprop="prepTime"]').attr('content') || undefined,
    cookTime: recipe.find('[itemprop="cookTime"]').attr('content') || undefined,
    servings: parseInt(recipe.find('[itemprop="recipeYield"]').first().text()) || undefined,
    imageUrl: recipe.find('[itemprop="image"]').attr('src') || undefined
  };
}

function findListWithMostMeasurements($, list) {
  let maxMeasurements = 0;
  let bestList = null;

  list.each((_, element) => {
    const text = $(element).text().toLowerCase();
    const measurementCount = RECIPE_PATTERNS.measurements.reduce((count, measurement) => {
      return count + (text.includes(measurement) ? 1 : 0);
    }, 0);

    if (measurementCount > maxMeasurements) {
      maxMeasurements = measurementCount;
      bestList = element;
    }
  });

  return bestList;
}

function findInstructionsList($, lists) {
  return lists.filter((_, list) => {
    const items = $(list).find('li');
    if (items.length < 2) return false;

    // Check if list items start with numbers or have sequential steps
    let hasNumbers = false;
    items.each((index, item) => {
      const text = $(item).text().trim().toLowerCase();
      if (text.match(/^(\d+\.|\d+\)|\d+|step\s+\d+)/)) {
        hasNumbers = true;
      }
    });

    // Check for instruction-related words
    const listText = $(list).text().toLowerCase();
    const hasInstructionWords = RECIPE_PATTERNS.instructions.some(word => 
      listText.includes(word)
    );

    return hasNumbers || hasInstructionWords;
  }).first();
}

async function intelligentExtraction(html) {
  const $ = load(html);
  
  // Find title (usually the first h1, or the largest heading if no h1)
  const title = $('h1').first().text() || 
                $('h2').first().text() || 
                $('meta[property="og:title"]').attr('content') || 
                $('title').text() || '';

  // Find image
  const imageUrl = $('meta[property="og:image"]').attr('content') ||
                  $('article img, .recipe img, .post img').first().attr('src') ||
                  undefined;

  // Find all lists in the document
  const lists = $('ul, ol');
  
  // Find ingredients by looking for lists with measurements
  const ingredientsList = findListWithMostMeasurements($, lists);
  const ingredients = ingredientsList 
    ? $(ingredientsList)
        .find('li')
        .map((_, el) => $(el).text())
        .get()
        .filter(text => text && typeof text === 'string')
    : [];

  // Find instructions by looking for numbered lists or lists with instruction-related words
  const instructionsList = findInstructionsList($, lists);
  const instructions = instructionsList
    ? $(instructionsList)
        .find('li')
        .map((_, el) => $(el).text())
        .get()
        .filter(text => text && typeof text === 'string')
    : [];

  // Try to find serving information
  const servingsMatch = $.text().match(/serves\s+(\d+)|servings?:\s*(\d+)|yield:\s*(\d+)/i);
  const servings = servingsMatch ? parseInt(servingsMatch[1] || servingsMatch[2] || servingsMatch[3]) : undefined;

  // Try to find timing information
  const prepTimeMatch = $.text().match(/prep(?:aration)?\s+time:?\s*(\d+)\s*(min|minutes|hour|hours|hrs?)/i);
  const cookTimeMatch = $.text().match(/cook(?:ing)?\s+time:?\s*(\d+)\s*(min|minutes|hour|hours|hrs?)/i);

  return {
    title,
    ingredients,
    instructions,
    prepTime: prepTimeMatch ? `${prepTimeMatch[1]} ${prepTimeMatch[2]}` : undefined,
    cookTime: cookTimeMatch ? `${cookTimeMatch[1]} ${cookTimeMatch[2]}` : undefined,
    servings,
    imageUrl
  };
}

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://pantrypal-sabirshalabi.vercel.app',
    'https://pantrypal-liard.vercel.app'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Spoonacular API endpoint
app.post('/api/spoonacular/search', async (req, res) => {
  const { ingredients, number = 10, ranking = 2, ignorePantry = false } = req.body;

  if (!ingredients) {
    return res.status(400).json({ error: 'Ingredients are required' });
  }

  if (!process.env.SPOONACULAR_API_KEY) {
    return res.status(500).json({ error: 'Spoonacular API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${process.env.SPOONACULAR_API_KEY}&ingredients=${ingredients}&number=${number}&ranking=${ranking}&ignorePantry=${ignorePantry}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Spoonacular API error');
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Spoonacular search error:', error);
    return res.status(500).json({
      error: 'Failed to search recipes',
      details: error.message
    });
  }
});

app.post('/api/scrape-recipe', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Try different extraction methods in order of reliability
    let recipe = await extractJsonLd(html);
    
    if (!recipe || (!recipe.ingredients?.length && !recipe.instructions?.length)) {
      recipe = await extractMicrodata(html);
    }
    
    if (!recipe || (!recipe.ingredients?.length && !recipe.instructions?.length)) {
      recipe = await intelligentExtraction(html);
    }
    
    // Final validation and cleanup
    if (recipe) {
      recipe = {
        ...recipe,
        title: (recipe.title || 'Untitled Recipe').trim(),
        ingredients: (recipe.ingredients || [])
          .filter(i => i && typeof i === 'string')
          .map(i => i.trim())
          .filter(i => i.length > 0 && i !== 'Advertisement'),
        instructions: (recipe.instructions || [])
          .filter(i => i && typeof i === 'string')
          .map(i => i.trim())
          .filter(i => i.length > 0 && i !== 'Advertisement'),
        prepTime: recipe.prepTime || undefined,
        cookTime: recipe.cookTime || undefined,
        servings: recipe.servings || undefined,
        imageUrl: recipe.imageUrl || undefined
      };
    }
    
    if (!recipe || (!recipe.ingredients?.length && !recipe.instructions?.length)) {
      return res.status(400).json({ error: 'Could not extract recipe from the provided URL' });
    }
    
    return res.status(200).json(recipe);
  } catch (error) {
    console.error('Error scraping recipe:', error);
    return res.status(500).json({ error: 'Failed to scrape recipe' });
  }
});

// LLM-powered recipe scraping endpoint
app.post('/api/scrape-recipe-llm', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  // Initialize Gemini
  const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = await import("@google/generative-ai");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });

  const generationConfig = {
    temperature: 0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  try {
    // Fetch webpage HTML
    const response = await fetch(url);
    const html = await response.text();

    // First try standard extraction methods for metadata
    let metadata = await extractJsonLd(html);
    if (!metadata) {
      metadata = await extractMicrodata(html);
    }
    if (!metadata) {
      metadata = await intelligentExtraction(html);
    }

    // Set default metadata if none found
    metadata = {
      title: (metadata?.title || '').trim() || 'Untitled Recipe',
      prepTime: metadata?.prepTime || null,
      cookTime: metadata?.cookTime || null,
      servings: metadata?.servings || null,
      imageUrl: metadata?.imageUrl || null
    };

    // Clean HTML while preserving important content
    const $ = load(html);
    
    // Clean and process HTML content
    let cleanHtml = '';
    
    // First try to find structured recipe data
    const recipeContent = $('[itemtype*="Recipe"]').first();
    if (recipeContent.length) {
      console.log('Found structured recipe data');
      cleanHtml = recipeContent.html();
      if (!cleanHtml || cleanHtml.length < 100) {
        console.log('Insufficient structured recipe content, trying other methods');
      } else {
        console.log('Using structured recipe content');
      }
    }
    
    if (!cleanHtml || cleanHtml.length < 100) {
      // Remove non-content elements
      $('script, style, meta, link, noscript, iframe, svg').remove();
      $('header, footer, nav, aside, [role="banner"], [role="navigation"], [role="complementary"]').remove();
      
      // Find main recipe content
      const mainContent = $('main, article, [class*="recipe"], [class*="Recipe"], [id*="recipe"], [id*="Recipe"]').first();
      if (mainContent.length) {
        console.log('Found main recipe content area');
        cleanHtml = mainContent.html();
      }
    }
    
    if (!cleanHtml || cleanHtml.length < 100) {
      // Look for recipe sections
      const sections = [];
      $('h1, h2, h3, h4').each((_, el) => {
        const $heading = $(el);
        const headingText = $heading.text().toLowerCase();
        const isRecipeSection = 
          headingText.includes('recipe') || 
          headingText.includes('ingredient') || 
          headingText.includes('instruction') || 
          headingText.includes('direction') || 
          headingText.includes('method');
        
        if (isRecipeSection) {
          const $section = $heading.parent();
          const $lists = $section.find('ul, ol');
          if ($lists.length) {
            sections.push($section.html());
          }
        }
      });

      if (sections.length > 0) {
        console.log('Found recipe sections by headings');
        cleanHtml = sections.join('\n');
      }
    }
    
    if (!cleanHtml || cleanHtml.length < 100) {
      // Fallback: Look for lists with measurements
      const lists = $('ul, ol').filter((_, list) => {
        const text = $(list).text().toLowerCase();
        return RECIPE_PATTERNS.measurements.some(m => text.includes(m));
      });

      if (lists.length > 0) {
        console.log('Found lists with measurements');
        cleanHtml = lists.map((_, list) => $(list).html()).get().join('\n');
      }
    }
    
    if (!cleanHtml || cleanHtml.length < 100) {
      // Last resort: just use the body content
      cleanHtml = $.html('body');
      if (!cleanHtml || cleanHtml.length < 100) {
        throw new Error('No usable recipe content found on page');
      }
      console.log('Using full body content');
    }
    
    console.log('HTML content length:', cleanHtml.length);

    // Construct prompts
    const systemPrompt = `You are a recipe ingredient and instruction extraction assistant. Given an HTML recipe page:
1. Find and list ALL ingredients with their measurements and quantities.
2. Extract step-by-step cooking instructions in a clear, ordered format.
3. Return ONLY these two elements in a JSON object matching this structure:
{
  "ingredients": string[],
  "instructions": string[]
}`;

    const userPrompt = `Extract ONLY the ingredients and instructions from this recipe content. Return them in a JSON object with 'ingredients' and 'instructions' arrays. Each ingredient should include its quantity and unit if present. Instructions should be clear and complete steps. No other information needed.

Content:
${cleanHtml}`;

    // Call Gemini API
    let recipeData;
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I will extract recipe ingredients and instructions and return them in JSON format." }]
          },
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig,
      });

      const response = await result.response;
      const content = await response.text();
      
      // Parse the JSON response
      recipeData = JSON.parse(content);

      // Log the raw response for debugging
      console.log('Raw Gemini response:', content);
    } catch (error) {
      console.error('Error processing Gemini response:', error);
      throw new Error('Failed to process Gemini response');
    }

    if (!recipeData) {
      throw new Error('No recipe data extracted from Gemini response');
    }
    
    // Combine metadata with LLM-extracted ingredients and instructions
    const recipe = {
      ...metadata, // Include title, prepTime, cookTime, servings, imageUrl from standard extraction
      ingredients: (recipeData.ingredients || [])
        .map(i => i?.trim())
        .filter(i => i && i.length > 0 && typeof i === 'string'),
      instructions: (recipeData.instructions || [])
        .map(i => i?.trim())
        .filter(i => i && i.length > 0 && typeof i === 'string'),
      sourceUrl: url // Add source URL
    };

    // Log the processed recipe for debugging
    console.log('Processed recipe:', recipe);

    // More detailed validation
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      throw new Error('Invalid or missing ingredients array in LLM response');
    }
    if (!recipe.instructions || !Array.isArray(recipe.instructions)) {
      throw new Error('Invalid or missing instructions array in LLM response');
    }
    if (!recipe.ingredients.length && !recipe.instructions.length) {
      throw new Error('Could not extract recipe data - no ingredients or instructions found');
    }

    return res.json(recipe);

  } catch (error) {
    console.error('LLM scraping error:', error);
    // Include more details in error response
    return res.status(500).json({
      error: error.message || 'Failed to scrape recipe using LLM',
      details: error.stack
    });
  }
});

app.post('/api/generate-recipe', async (req, res) => {
  const { filters } = req.body;

  console.log('Received generate-recipe request with filters:', filters);

  // Validate inputs
  if (!filters?.ingredients?.length) {
    console.error('Missing ingredients in request');
    return res.status(400).json({ error: 'At least one ingredient required' });
  }

  // Validate API keys
  if (!process.env.MEALDB_API_KEY) {
    console.error('Missing MEALDB_API_KEY');
    return res.status(500).json({ error: 'Missing required API configuration: MEALDB_API_KEY' });
  }
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'Missing required API configuration: GEMINI_API_KEY' });
  }

  try {
    // Step 1: Fetch recipes from MealDB for each ingredient
    const fetchRecipesByIngredient = async (ingredient) => {
      try {
        console.log(`Fetching recipes for ingredient: ${ingredient}`);
        const response = await fetch(
          `https://www.themealdb.com/api/json/v2/${process.env.MEALDB_API_KEY}/filter.php?i=${encodeURIComponent(ingredient)}`
        );
        if (!response.ok) {
          console.error(`MealDB API error for ${ingredient}:`, await response.text());
          throw new Error(`MealDB API error for ingredient: ${ingredient}`);
        }
        const data = await response.json();
        console.log(`Found ${data.meals?.length || 0} recipes for ${ingredient}`);
        return data;
      } catch (error) {
        console.error(`Failed to fetch recipes for ${ingredient}:`, error);
        return { meals: [] };
      }
    };

    // Concurrent API requests with timeout
    const mealDbPromises = filters.ingredients.map(ingredient =>
      Promise.race([
        fetchRecipesByIngredient(ingredient),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )
      ])
    );

    const mealDbResults = await Promise.allSettled(mealDbPromises);
    
    // Aggregate successful results
    const allRecipes = mealDbResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value.meals || []);

    // Get unique recipes
    const uniqueRecipes = [...new Map(allRecipes.map(recipe => [recipe.idMeal, recipe])).values()];

    if (uniqueRecipes.length === 0) {
      return res.status(404).json({ error: 'No recipes found for the given ingredients' });
    }

    // Step 2: Initialize Gemini with schema
    console.log('Initializing Gemini AI');
    const { GoogleGenerativeAI, SchemaType } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Define the schema for recipe generation
    const recipeSchema = {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Name of the recipe",
        },
        description: {
          type: SchemaType.STRING,
          description: "Brief description of the recipe",
        },
        ingredients: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              item: {
                type: SchemaType.STRING,
                description: "Ingredient name",
              },
              amount: {
                type: SchemaType.STRING,
                description: "Quantity with unit",
              },
            },
            required: ["item", "amount"],
          },
        },
        instructions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
            description: "Step-by-step cooking instructions",
          },
        },
      },
      required: ["title", "description", "ingredients", "instructions"],
    };

    // Create a model instance with the schema
    console.log('Creating Gemini model with schema');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Generate the prompt
    const prompt = `Create a unique recipe that combines elements from these recipes: ${uniqueRecipes.slice(0, 3).map(r => r.strMeal).join(', ')}. 
    Use these ingredients: ${filters.ingredients.join(', ')}
    ${filters.difficulty ? `Difficulty level: ${filters.difficulty}` : ''}
    
    Return a JSON object with:
    - A creative title
    - A brief description
    - A detailed list of ingredients with amounts
    - Clear step-by-step instructions
    
    Make it unique and interesting!`;

    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    console.log('Received response from Gemini');
    
    let generatedRecipe;
    try {
      generatedRecipe = JSON.parse(response.text());
      console.log('Successfully parsed Gemini response');
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Raw response:', response.text());
      throw new Error('Failed to parse generated recipe data');
    }

    // Step 4: Validate and enhance recipe
    if (!generatedRecipe?.ingredients?.length || !generatedRecipe?.instructions?.length) {
      console.error('Generated recipe is missing required components:', generatedRecipe);
      throw new Error('Generated recipe is missing required components');
    }

    // Step 5: Add metadata and estimates
    const finalRecipe = {
      ...generatedRecipe,
      metadata: {
        source: 'AI-generated fusion',
        generatedAt: new Date().toISOString(),
        basedOn: uniqueRecipes.slice(0, 3).map(r => r.strMeal),
        filters: filters
      },
      nutrition: await generateNutritionalEstimate(generatedRecipe.ingredients)
    };

    console.log('Sending final recipe response');
    return res.json(finalRecipe);

  } catch (error) {
    console.error('Recipe generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate recipe',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(process.env.PORT || 3001, () => console.log(`Server listening on port ${process.env.PORT || 3001}`));

// Recipe generation utilities
const RECIPE_DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const generateNutritionalEstimate = async (ingredients) => {
  // Basic estimation based on ingredient count and types
  const baseCalories = ingredients.length * 75;
  return {
    calories: baseCalories,
    protein: Math.round(ingredients.length * 4.5),
    carbs: Math.round(ingredients.length * 6.2),
    disclaimer: 'Nutritional values are estimated and should be used as a general guide only.'
  };
};

export default app;
