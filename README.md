# AI Chat Application with Ollama Integration

A powerful chat application that integrates with Ollama to provide multiple AI model support, including image analysis capabilities.

![Application Overview](https://i.postimg.cc/4NMPR0GN/chat-3.png)

## Features

### 1. Multi-Model Support
- Support for multiple Ollama models:
  - Qwen 2.5 7B
  - Qwen 2.5 Coder
  - DeepSeek R1 8B
  - Llava (Image Analysis Model)

![Model Selection](https://i.postimg.cc/c1hk2T6r/chat2.png)

### 2. Chat Management
- Create new chat sessions
- Continue existing conversations with context preservation
- Automatic chat history saving
- Real-time streaming responses

![Chat Interface](https://i.postimg.cc/Kc0QJzsT/chat-ai.png)

### 3. Image Analysis
- Upload and analyze images using the Llava model
- Support for various image formats
- Real-time image preview
- Contextual responses based on image content

![Image Analysis]

### 4. Conversation Features
- Markdown support in responses
- Code syntax highlighting
- Message history preservation
- Real-time response streaming

![Conversation Features]
## Getting Started

### Prerequisites
1. Install Ollama on your system
2. Pull required models:
```bash
ollama pull qwen2.5:7b
ollama pull qwen2.5-coder
ollama pull deepseek-r1:8b
ollama pull llava:7b
```

### Installation
1. Clone the repository
```bash
git clone <repository-url>
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Starting a New Chat
1. Click the "New Chat" button
2. Select your desired model
3. Type your message or upload an image
4. Press send or hit Enter

### Image Analysis
1. Select the Llava model
2. Click the image upload button
3. Select your image
4. Add any additional text prompt (optional)
5. Send your message

### Continuing Conversations
- Previous chats are saved automatically
- Click on any chat in the sidebar to continue the conversation
- Context is preserved throughout the conversation

## Technical Details

### Architecture
- Next.js 14 with App Router
- MongoDB for chat storage
- Ollama API integration
- Server-Sent Events for streaming responses

### API Endpoints
- `/api/chat`: Handles chat messages and image analysis
- `/api/chats`: Manages chat sessions

### Models
- Chat sessions with message history
- Support for different message types (text, images)
- Real-time response streaming

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.


## Acknowledgments
- Ollama team for providing the model API
- Next.js team for the framework
