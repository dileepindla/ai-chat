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
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
  { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' }
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

    if (mediaFile) {
      mediaUrl = URL.createObjectURL(mediaFile);
      mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'audio';
    }

    const newMessage = {
      role: 'user',
      content: message,
      mediaUrl,
      mediaType
    };

    // If it's a new chat, create it with the first message as title
    if (!currentChatId) {
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            title: message.substring(0, 50),
            messages: [newMessage]
          })
        });
        const newChat = await response.json();
        setCurrentChatId(newChat._id);
        fetchChats(); // Refresh sidebar
      } catch (error) {
        console.error('Error creating new chat:', error);
      }
    }

    setChatHistory(prev => [...prev, newMessage]);
    setMessage('');
    setMediaFile(null);

    try {
      abortController.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          message,
          chatId: currentChatId,
          mediaUrl,
          mediaType,
          apiKeys
        }),
        signal: abortController.current.signal
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        assistantMessage += chunk;

        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[newHistory.length - 1]?.role === 'assistant') {
            newHistory[newHistory.length - 1].content = assistantMessage;
          } else {
            newHistory.push({ role: 'assistant', content: assistantMessage });
          }
          return newHistory;
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream was stopped');
      } else {
        console.error('Error:', error);
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
                className={`mb-4 flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.mediaUrl && msg.mediaType === 'image' && (
                    <img
                      src={msg.mediaUrl}
                      alt="User uploaded"
                      className="max-w-xs mb-2 rounded"
                    />
                  )}
                  {msg.mediaUrl && msg.mediaType === 'audio' && (
                    <audio controls className="mb-2">
                      <source src={msg.mediaUrl} type="audio/mpeg" />
                    </audio>
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
              accept="image/*,audio/*"
              onChange={(e) => setMediaFile(e.target.files[0])}
              className="w-1/4"
            />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
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
