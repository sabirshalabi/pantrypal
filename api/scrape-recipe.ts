import { load } from 'cheerio';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  imageUrl?: string;
}

async function extractJsonLd(html: string): Promise<Recipe | null> {
  const $ = load(html);
  const jsonLdScript = $('script[type="application/ld+json"]').first().html();
  
  if (!jsonLdScript) return null;
  
  try {
    const data = JSON.parse(jsonLdScript);
    const recipe = data['@graph']?.find((item: any) => item['@type'] === 'Recipe') || 
                  (data['@type'] === 'Recipe' ? data : null);
    
    if (!recipe) return null;
    
    return {
      title: recipe.name,
      ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
      instructions: Array.isArray(recipe.recipeInstructions) 
        ? recipe.recipeInstructions.map((instruction: any) => 
            typeof instruction === 'string' ? instruction : instruction.text)
        : [],
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.recipeYield ? parseInt(recipe.recipeYield) : undefined,
      imageUrl: recipe.image?.[0] || recipe.image
    };
  } catch (error) {
    console.error('Error parsing JSON-LD:', error);
    return null;
  }
}

async function extractMicrodata(html: string): Promise<Recipe | null> {
  const $ = load(html);
  const recipe = $('[itemtype*="Recipe"]').first();
  
  if (!recipe.length) return null;
  
  return {
    title: recipe.find('[itemprop="name"]').first().text().trim(),
    ingredients: recipe.find('[itemprop="recipeIngredient"]').map((_, el) => $(el).text().trim()).get(),
    instructions: recipe.find('[itemprop="recipeInstructions"]').map((_, el) => $(el).text().trim()).get(),
    prepTime: recipe.find('[itemprop="prepTime"]').attr('content'),
    cookTime: recipe.find('[itemprop="cookTime"]').attr('content'),
    servings: parseInt(recipe.find('[itemprop="recipeYield"]').first().text()) || undefined,
    imageUrl: recipe.find('[itemprop="image"]').attr('src')
  };
}

async function fallbackExtraction(html: string): Promise<Recipe | null> {
  const $ = load(html);
  
  // Basic fallback extraction looking for common recipe page patterns
  const title = $('h1').first().text().trim();
  const ingredients = $('ul li').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('cup') || text.includes('tablespoon') || text.includes('teaspoon');
  }).map((_, el) => $(el).text().trim()).get();
  
  const instructions = $('ol li').map((_, el) => $(el).text().trim()).get();
  
  if (!title || ingredients.length === 0 || instructions.length === 0) {
    return null;
  }
  
  return {
    title,
    ingredients,
    instructions,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Try different extraction methods in order of preference
    const recipe = await extractJsonLd(html) || 
                  await extractMicrodata(html) || 
                  await fallbackExtraction(html);
    
    if (!recipe) {
      return res.status(400).json({ error: 'Could not extract recipe from the provided URL' });
    }
    
    return res.status(200).json(recipe);
  } catch (error) {
    console.error('Error scraping recipe:', error);
    return res.status(500).json({ error: 'Failed to scrape recipe' });
  }
}
