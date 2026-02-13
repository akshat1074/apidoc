import axios from 'axios';

export async function analyzeCode(code: string, filename: string) {
  const prompt = `You are a technical documentation expert. Analyze this code file and generate API documentation.

FILENAME: ${filename}

CODE:
${code}

Generate documentation in JSON format with the following structure:
{
  "functions": [
    {
      "name": "functionName",
      "parameters": ["param1: type", "param2: type"],
      "returnType": "type",
      "description": "what it does",
      "example": "code example"
    }
  ],
  "classes": [...],
  "exports": [...]
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Grok API error: ${JSON.stringify(error.response?.data) || error.message}`);
    }
    throw error;
  }
}