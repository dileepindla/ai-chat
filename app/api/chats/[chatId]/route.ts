import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Chat } from '@/lib/db/models/Chat';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await connectDB();
    await Chat.findByIdAndDelete(params.chatId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 