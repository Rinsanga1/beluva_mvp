import { z } from 'zod';
import { apiLogger } from './logger';

/**
 * LLM Service wrapper that supports both OpenAI and Gemini models
 * with easy model switching via an environment variable
 */

// Schema for LLM provider configuration
const LLMProviderSchema = z.enum(['openai', 'gemini']);
type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Get the current LLM provider from environment variable
const getCurrentProvider = (): LLMProvider => {
  const provider = process.env.NEXT_PUBLIC_LLM_SERVICE || 'openai';
  try {
    return LLMProviderSchema.parse(provider);
  } catch (error) {
    apiLogger.error('Invalid LLM provider in environment variable', { provider, error });
    return 'openai'; // Default to OpenAI if invalid
  }
};

// Common interface for text completion requests
export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

// Common interface for image analysis requests
export interface ImageAnalysisRequest {
  imageUrl: string;
  prompt: string;
  maxTokens?: number;
}

// Image generation request
export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
}

// Response types
export interface CompletionResponse {
  text: string;
  provider: LLMProvider;
}

export interface ImageAnalysisResponse {
  text: string;
  provider: LLMProvider;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  provider: LLMProvider;
}

/**
 * OpenAI API implementation
 */
const openAIService = {
  async textCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    apiLogger.info('OpenAI text completion request', { prompt: request.prompt.substring(0, 100) + '...' });
    
    try {
      const response = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: request.prompt,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return {
        text: data.choices[0].text.trim(),
        provider: 'openai'
      };
    } catch (error) {
      apiLogger.error('OpenAI text completion error', { error });
      throw error;
    }
  },
  
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    apiLogger.info('OpenAI image analysis request', { 
      imageUrl: request.imageUrl, 
      prompt: request.prompt.substring(0, 100) + '...'
    });
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: request.prompt },
                { type: 'image_url', image_url: { url: request.imageUrl } }
              ]
            }
          ],
          max_tokens: request.maxTokens || 1024
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return {
        text: data.choices[0].message.content.trim(),
        provider: 'openai'
      };
    } catch (error) {
      apiLogger.error('OpenAI image analysis error', { error });
      throw error;
    }
  },
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    apiLogger.info('OpenAI image generation request', { prompt: request.prompt.substring(0, 100) + '...' });
    
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: request.prompt,
          n: 1,
          size: `${request.width || 1024}x${request.height || 1024}`,
          response_format: 'url'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return {
        imageUrl: data.data[0].url,
        provider: 'openai'
      };
    } catch (error) {
      apiLogger.error('OpenAI image generation error', { error });
      throw error;
    }
  }
};

/**
 * Gemini API implementation
 */
const geminiService = {
  async textCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    apiLogger.info('Gemini text completion request', { prompt: request.prompt.substring(0, 100) + '...' });
    
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY as string
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: request.prompt }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 1024,
            temperature: request.temperature || 0.7
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      return {
        text,
        provider: 'gemini'
      };
    } catch (error) {
      apiLogger.error('Gemini text completion error', { error });
      throw error;
    }
  },
  
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    apiLogger.info('Gemini image analysis request', { 
      imageUrl: request.imageUrl, 
      prompt: request.prompt.substring(0, 100) + '...'
    });
    
    try {
      // First, convert image URL to base64 (for Gemini API)
      const imageResponse = await fetch(request.imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Call Gemini API
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY as string
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: request.prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 1024
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      return {
        text,
        provider: 'gemini'
      };
    } catch (error) {
      apiLogger.error('Gemini image analysis error', { error });
      throw error;
    }
  },
  
  // Gemini doesn't have an image generation API, so we'll fall back to OpenAI
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    apiLogger.warn('Gemini does not support image generation, falling back to OpenAI');
    return openAIService.generateImage(request);
  }
};

/**
 * LLM service factory that returns the appropriate implementation based on the environment
 */
const getLLMService = () => {
  const provider = getCurrentProvider();
  apiLogger.info(`Using LLM provider: ${provider}`);
  
  return provider === 'openai' ? openAIService : geminiService;
};

/**
 * Exported LLM service API
 */
const llmService = {
  /**
   * Generate text completion from a prompt
   */
  async completeText(request: CompletionRequest): Promise<CompletionResponse> {
    const service = getLLMService();
    return service.textCompletion(request);
  },
  
  /**
   * Analyze an image and return a text description
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    const service = getLLMService();
    return service.analyzeImage(request);
  },
  
  /**
   * Generate an image from a text prompt
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const service = getLLMService();
    return service.generateImage(request);
  },
  
  /**
   * Get the current LLM provider
   */
  getCurrentProvider
};

export default llmService;