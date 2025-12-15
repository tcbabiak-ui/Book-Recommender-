'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `📚 **Welcome to Book Recommender Bot!**

**Important:** This app requires a laptop or desktop computer. It does not work on mobile devices.

**How to get book recommendations:**

1. Go to https://read.amazon.com/kindle-library?itemView=compact

2. Scroll through your entire library to load all books, then press **Cmd+A** (Mac) or **Ctrl+A** (Windows) to select everything on the page

3. Press **Cmd+C** (Mac) or **Ctrl+C** (Windows) to copy, then paste everything into the chat below

4. Click Send to get personalized book recommendations based on your reading preferences!

Ready to get started? Paste your Kindle library below.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectKindleLibrary = (text: string): boolean => {
    // Check if text looks like Kindle library data
    // Large amount of text, multiple lines, contains book-like patterns
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const hasMultipleLines = lines.length > 10;
    const hasBookPatterns = /by\s+[A-Z]|author|title|book/i.test(text);
    const isLargeText = text.length > 500;
    
    return hasMultipleLines && (hasBookPatterns || isLargeText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageContent = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Check if this looks like Kindle library data
      const isKindleLibrary = detectKindleLibrary(messageContent);
      
      let prompt = messageContent;
      if (isKindleLibrary) {
        // Create a prompt for book recommendations
        prompt = `Analyze my Kindle library and provide book recommendations. Be concise.

My Kindle library:
${messageContent}

Provide:
1. Brief reading preferences summary (genres/themes)
2. 5-8 book recommendations (title, author, brief reason)

Keep it brief and direct.`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get response`);
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `📚 **Welcome to Book Recommender Bot!**

**Important:** This app requires a laptop or desktop computer. It does not work on mobile devices.

**How to get book recommendations:**

1. Go to https://read.amazon.com/kindle-library?itemView=compact

2. Scroll through your entire library to load all books, then press **Cmd+A** (Mac) or **Ctrl+A** (Windows) to select everything on the page

3. Press **Cmd+C** (Mac) or **Ctrl+C** (Windows) to copy, then paste everything into the chat below

4. Click Send to get personalized book recommendations based on your reading preferences!

Ready to get started? Paste your Kindle library below.`
      }
    ]);
    setError(null);
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Book Recommender Bot</h1>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            Clear Chat
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
            Error: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              // Auto-detect Kindle library on paste
              const pastedText = e.clipboardData.getData('text');
              if (detectKindleLibrary(pastedText)) {
                // Small delay to let paste complete
                setTimeout(() => {
                  // The text will be in input after paste, so we can show a hint
                }, 100);
              }
            }}
            placeholder="Type your message or paste your Kindle library here..."
            className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[60px] max-h-[200px]"
            disabled={loading}
            rows={3}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors font-medium self-end text-white"
          >
            Send
          </button>
        </div>
        {detectKindleLibrary(input) && input.length > 100 && (
          <p className="text-xs text-blue-600 mt-2">
            📚 Kindle library detected! Send to get personalized book recommendations.
          </p>
        )}
      </form>
    </main>
  );
}

