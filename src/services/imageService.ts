import Together from 'together-ai';

// Get API key from environment variables
const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

if (!TOGETHER_API_KEY) {
  console.error('Missing VITE_TOGETHER_API_KEY environment variable');
}

if (!GROQ_API_KEY) {
  console.error('Missing VITE_GROQ_API_KEY environment variable');
}

const together = new Together({ apiKey: TOGETHER_API_KEY || '' });

export interface ImageGenerationParams {
  title: string;
  ingredients: string[];
  mealType: string;
}

export async function generateRecipeImage(params: ImageGenerationParams): Promise<string> {
  if (!TOGETHER_API_KEY || !GROQ_API_KEY) {
    throw new Error('Missing required API keys. Please check your environment variables.');
  }

  try {
    console.log('Starting image generation with params:', params);
    
    // First, generate a descriptive prompt using Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a food photography prompt expert. Create concise, vivid prompts for AI image generation that capture the essence of dishes. Focus on lighting, composition, and food styling elements.'
          },
          {
            role: 'user',
            content: `Create a concise, descriptive prompt for generating an appetizing image of this recipe:
            Title: ${params.title}
            Type: ${params.mealType}
            Key ingredients: ${params.ingredients.join(', ')}
            
            The prompt should be focused on creating a beautiful food photography style image. Keep it under 100 words and focus on visual elements.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const promptData = await response.json();
    const imagePrompt = promptData.choices[0].message.content.trim();
    console.log('Generated image prompt:', imagePrompt);

    // Use the generated prompt to create an image with FLUX
    console.log('Calling Together AI for image generation...');
    const imageResponse = await together.images.create({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt: imagePrompt,
      height: 768,
      width: 1024,
      steps: 1,
      n: 1,
      response_format: 'url'
    });

    console.log('Raw Together AI response:', imageResponse);

    if (!imageResponse.data || !imageResponse.data.length) {
      throw new Error('No image generated from Together AI');
    }

    const url = imageResponse.data[0].url;
    console.log('Successfully generated image URL:', url);
    return url;
  } catch (error) {
    console.error('Error generating recipe image:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    } else {
      throw new Error('Failed to generate image: Unknown error');
    }
  }
}
