import Together from 'together-ai';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Get API key from environment variables
const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Get base URL for API endpoints
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://pantrypal-liard.vercel.app'
  : 'http://localhost:3000';

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

async function downloadImage(url: string): Promise<Blob> {
  try {
    // Use our proxy endpoint to avoid CORS issues
    const proxyUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    console.log('Attempting to download image from proxy:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy response error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Successfully downloaded image, size:', blob.size);
    return blob;
  } catch (error) {
    console.error('Error in downloadImage:', error);
    throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    const generatedImageUrl = imageResponse.data[0].url;
    console.log('Successfully generated image URL:', generatedImageUrl);

    // Download the image through our proxy and upload to Firebase Storage
    console.log('Downloading generated image...');
    const imageBlob = await downloadImage(generatedImageUrl);

    // Upload to Firebase Storage
    const storage = getStorage();
    const imagePath = `recipe-images/${Date.now()}-${params.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`;
    const imageRef = storageRef(storage, imagePath);

    console.log('Uploading to Firebase Storage...');
    await uploadBytes(imageRef, imageBlob);

    // Get the permanent URL
    const permanentUrl = await getDownloadURL(imageRef);
    console.log('Permanent Firebase Storage URL:', permanentUrl);

    return permanentUrl;
  } catch (error) {
    console.error('Error generating recipe image:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    } else {
      throw new Error('Failed to generate image: Unknown error');
    }
  }
}
