import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Chat } from '@/lib/db/models/Chat';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { model, title, messages } = body;

    const chat = new Chat({
      model,
      title,
      messages,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await chat.save();
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const chats = await Chat.find({})
      .sort({ updatedAt: -1 });

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const client = await connectDB();
    const db = client.db("ai-chat");
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    await db.collection("chats").deleteOne({
      _id: new ObjectId(id)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 