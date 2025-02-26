import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from 'lucide-react';

export function Sidebar({ chats, onSelectChat, onNewChat, onDeleteChat }) {
  return (
    <div className="w-64 border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <Button 
          className="w-full"
          onClick={onNewChat}
        >
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats?.map(chat => (
          <div
            key={chat?._id}
            className="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer"
          >
            <div 
              className="flex-1 truncate mr-2 min-w-0"
              onClick={() => onSelectChat(chat?._id)}
            >
              {chat?.messages?.[0]?.content 
                ? `${chat.messages[0].content.substring(0, 30)}...`
                : 'New Chat'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 ml-2"
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
    </div>
  );
} 