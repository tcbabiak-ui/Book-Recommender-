import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const { message, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build conversation history if provided
    let prompt = message;
    if (history && Array.isArray(history) && history.length > 0) {
      const historyText = history
        .map((h: { role: string; content: string }) => 
          `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
        )
        .join('\n');
      prompt = `${historyText}\nUser: ${message}\nAssistant:`;
    }
    
    // Add instruction to be brief
    prompt = `${prompt}\n\nIMPORTANT: Keep your response concise and brief. Be direct and to the point.`;

    // First, try to list available models to see what's actually available
    let availableModel: string | null = null;
    
    try {
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (listResponse.ok) {
        const modelsData = await listResponse.json();
        const models = modelsData.models || [];
        
        // Look for a model that supports generateContent
        const supportedModel = models.find((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') &&
          (m.name.includes('gemini') || m.name.includes('models/gemini'))
        );
        
        if (supportedModel) {
          // Extract model name (remove 'models/' prefix if present)
          availableModel = supportedModel.name.replace('models/', '');
        }
      }
    } catch (e) {
      console.log('Could not list models, will try defaults');
    }

    // Try models in order of preference
    const modelNames = availableModel 
      ? [availableModel]
      : [
          'gemini-1.5-flash-latest',
          'gemini-1.5-pro-latest',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-pro',
        ];

    let lastError: any = null;
    
    for (const modelName of modelNames) {
      try {
        // Try v1beta first, then v1
        const endpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`
        ];
        
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }]
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                return NextResponse.json({ response: text });
              }
            } else {
              const errorData = await response.json().catch(() => ({}));
              if (response.status === 404) {
                // Try next endpoint or model
                continue;
              } else {
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
              }
            }
          } catch (endpointError: any) {
            // Try next endpoint
            continue;
          }
        }
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }

    // If all models failed, return error with helpful message
    throw lastError || new Error('No available models found. Please check your API key and model access.');
  } catch (error: any) {
    console.error('Gemini API error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate response: ${errorMessage}` },
      { status: 500 }
    );
  }
}

