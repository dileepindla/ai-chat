import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from 'lucide-react';

export function Sidebar({ chats, onSelectChat, onNewChat, onDeleteChat }) {
  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col h-full">
      <div className="p-4">
        <Button onClick={onNewChat} className="w-full">
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Array.isArray(chats) && chats.map((chat) => (
            <div
              key={chat?._id}
              className="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer group"
            >
              <div 
                className="flex-1 truncate mr-2"
                onClick={() => onSelectChat(chat?._id)}
              >
                {chat?.messages?.[0]?.content 
                  ? `${chat.messages[0].content.substring(0, 30)}...`
                  : 'New Chat'}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat._id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 