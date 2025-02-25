import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Chat } from '@/lib/db/models/Chat';

const EXTERNAL_MODELS = {
  'gpt-4': 'openai',
  'claude-3': 'anthropic',
  // Add more external models
};

async function streamExternalModel(model: string, messages: any[], apiKey: string) {
  if (model.startsWith('gpt')) {
    // OpenAI implementation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
    return response;
  } else if (model.startsWith('claude')) {
    // Anthropic implementation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
    return response;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { model, message, chatId, mediaUrl, mediaType, apiKeys } = await req.json();
    
    await connectDB();

    let chat;
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
    } else {
      chat = new Chat({ model });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      mediaUrl,
      mediaType
    });

    // Determine if using external model
    const isExternalModel = EXTERNAL_MODELS[model];
    
    const response = new Response(
      new ReadableStream({
        async start(controller) {
          try {
            let responseStream;
            
            if (isExternalModel) {
              const apiKey = apiKeys[EXTERNAL_MODELS[model]];
              if (!apiKey) throw new Error(`API key required for ${model}`);
              responseStream = await streamExternalModel(model, chat.messages, apiKey);
            } else {
              responseStream = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model,
                  messages: chat.messages.map(m => ({
                    role: m.role,
                    content: m.content
                  })),
                  stream: true
                })
              });
            }

            const reader = responseStream.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let assistantMessage = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter(Boolean);
              
              for (const line of lines) {
                const data = JSON.parse(line);
                const content = data.message?.content || data.choices?.[0]?.delta?.content || '';
                assistantMessage += content;
                controller.enqueue(new TextEncoder().encode(content));
              }
            }

            // Save assistant's message to DB
            chat.messages.push({
              role: 'assistant',
              content: assistantMessage
            });
            await chat.save();

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );

    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 