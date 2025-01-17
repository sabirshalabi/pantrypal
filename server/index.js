import express from 'express';
import cors from 'cors';
import { load } from 'cheerio';
import fetch from 'node-fetch';

const app = express();

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
  origin: ['http://localhost:5173', 'https://pantrypal-sabirshalabi.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

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

export default app;
