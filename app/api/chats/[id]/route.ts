import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Chat } from '@/lib/db/models/Chat';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await Chat.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    
    const updatedChat = await Chat.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
} 