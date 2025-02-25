import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Chat } from '@/lib/db/models/Chat';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const chats = await Chat.find().sort({ updatedAt: -1 });
    return new Response(JSON.stringify(chats), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 