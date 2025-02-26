'use client';

import { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/Sidebar";
import { Settings } from "@/components/Settings";
import ReactMarkdown from 'react-markdown';

const models = [
  { id: 'llama3:8b', name: 'LLama 3 8B' },
  { id: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder' },
  { id: 'deepseek-r1:14b', name: 'DeepSeek R1' },
  { id: 'llava:7b', name: 'Llava 7B' }
];

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    // Add more providers as needed
  });
  const [isStreaming, setIsStreaming] = useState(false);
  
  const messagesEndRef = useRef(null);
  const abortController = useRef(null);

  useEffect(() => {
    fetchChats();
    // Load API keys from localStorage
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
  }, []);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setAllChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const chat = allChats.find(c => c._id === chatId);
      if (chat) {
        setCurrentChatId(chatId);
        setChatHistory(chat.messages);
        setSelectedModel(chat.model);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleStopStream = () => {
    if (abortController.current) {
      abortController.current.abort();
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message && !mediaFile) return;

    setIsLoading(true);
    setIsStreaming(true);
    let mediaUrl = null;
    let mediaType = null;
    let base64Image = null;

    // Store the user's message for reference
    const userMessage = message;

    if (mediaFile) {
      console.log("MediaFile received:", mediaFile);
      mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'audio';
      console.log("MediaType detected:", mediaType);
      
      if (mediaType === 'image') {
        // Convert to base64 only
        const reader = new FileReader();
        try {
          base64Image = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              console.log("FileReader result received");
              const base64String = reader.result as string;
              console.log("Base64 string length:", base64String.length);
              // Store both base64Image and mediaUrl as the base64 string for preview
              mediaUrl = base64String;
              resolve(base64String.split(',')[1]);
            };
            reader.onerror = (error) => {
              console.error("FileReader error:", error);
              reject(error);
            };
            reader.readAsDataURL(mediaFile);
          });
          console.log("Base64 conversion complete, length:", base64Image?.length);
        } catch (error) {
          console.error("Error converting to base64:", error);
        }
      } else {
        mediaUrl = URL.createObjectURL(mediaFile);
      }
    }

    console.log("Final base64Image:", base64Image ? base64Image.substring(0, 100) + "..." : null);

    const newMessage = {
      role: 'user',
      content: userMessage,
      mediaUrl,
      mediaType
    };

    // Update local chat history with user message immediately
    setChatHistory(prev => [...prev, newMessage]);
    setMessage('');
    setMediaFile(null);

    let chatId = currentChatId;
    
    // Create a new chat only if this is the first message
    if (!chatId && chatHistory.length === 0) {
      try {
        console.log('Creating new chat with payload:', {
          model: selectedModel,
          title: userMessage.substring(0, 50),
          messages: [newMessage]
        });

        const createChatResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            title: userMessage.substring(0, 50),
            messages: [{
              role: 'user',
              content: userMessage,
              mediaUrl: mediaUrl || null,
              mediaType: mediaType || null
            }]
          })
        });

        if (!createChatResponse.ok) {
          const errorData = await createChatResponse.text();
          console.error('Chat creation failed:', {
            status: createChatResponse.status,
            statusText: createChatResponse.statusText,
            error: errorData
          });
          throw new Error(`Failed to create chat: ${createChatResponse.status} ${errorData}`);
        }

        const newChat = await createChatResponse.json();
        console.log('New chat created:', newChat);
        
        if (!newChat._id) {
          throw new Error('Created chat is missing _id');
        }

        chatId = newChat._id;
        setCurrentChatId(chatId);
        await fetchChats(); // Refresh sidebar
      } catch (error) {
        console.error('Detailed error creating new chat:', error);
        setChatHistory(prev => prev.slice(0, -1));
        setIsLoading(false);
        setIsStreaming(false);
        // Show error to user
        alert(`Failed to create chat: ${error.message}`);
        return;
      }
    }

    try {
      abortController.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          message: userMessage,
          chatId,
          mediaUrl,
          mediaType,
          base64Image,
          apiKeys
        }),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Ensure the chunk is valid before processing
        try {
          const chunk = new TextDecoder().decode(value);
          assistantMessage += chunk;

          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            
            if (lastMessage?.role === 'assistant') {
              newHistory[newHistory.length - 1] = {
                ...lastMessage,
                content: assistantMessage
              };
            } else {
              newHistory.push({ role: 'assistant', content: assistantMessage });
            }
            return newHistory;
          });
        } catch (error) {
          console.error('Error processing chunk:', error);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream was stopped');
      } else {
        console.error('Error:', error);
        // Remove the last message if there was an error
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[newHistory.length - 1]?.role === 'assistant') {
            return newHistory.slice(0, -1);
          }
          return newHistory;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const formatMessage = (content) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-200 px-1 rounded" {...props}>
                {children}
              </code>
            );
          },
          strong({ node, children }) {
            return <span className="font-bold">{children}</span>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar 
        chats={allChats} 
        onSelectChat={loadChat}
        onNewChat={() => {
          setCurrentChatId(null);
          setChatHistory([]);
        }}
        onDeleteChat={async (chatId) => {
          try {
            await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
            fetchChats();
            if (currentChatId === chatId) {
              setCurrentChatId(null);
              setChatHistory([]);
            }
          } catch (error) {
            console.error('Error deleting chat:', error);
          }
        }}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Settings 
            apiKeys={apiKeys}
            onUpdateApiKeys={setApiKeys}
          />
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {msg.mediaUrl && msg.mediaType === 'image' && (
                    <img
                      src={msg.mediaUrl}
                      alt="Uploaded content"
                      className="max-w-sm mb-2 rounded"
                    />
                  )}
                  <div className="whitespace-pre-wrap">
                    {formatMessage(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                console.log("File selected:", file);
                setMediaFile(file);
              }}
              className="w-1/4"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={isLoading}
              className="flex-1 p-2 border rounded-md resize-none min-h-[40px] max-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '40px',
                maxHeight: '200px'
              }}
            />
            {isStreaming ? (
              <Button type="button" onClick={handleStopStream} variant="destructive">
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                Send
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
