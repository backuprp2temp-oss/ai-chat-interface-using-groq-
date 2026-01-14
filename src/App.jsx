import React, { useState, useEffect } from 'react';
import Groq from 'groq-sdk';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { TranscriptionInterface } from './components/TranscriptionInterface';
import { TTSInterface } from './components/TTSInterface';
import { ApiKeyModal } from './components/ApiKeyModal';
import { v4 as uuidv4 } from 'uuid';
import { Toaster, toast } from 'sonner';

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(!apiKey);
  const [currentModel, setCurrentModel] = useState('moonshotai/kimi-k2-instruct-0905');
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'transcription', or 'tts'
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('groq_system_prompt') || '');

  // Session Management
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('chat_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('current_session_id') || null;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Derived state for current messages
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('groq_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('groq_system_prompt', systemPrompt);
  }, [systemPrompt]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Persist current session ID
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('current_session_id', currentSessionId);
    } else {
      localStorage.removeItem('current_session_id');
    }
  }, [currentSessionId]);

  const createNewSession = () => {
    const newSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      timestamp: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
    setCurrentView('chat'); // Switch to chat view when creating new session
    return newSession.id;
  };

  // Ensure there's always a session on start if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, []);

  const updateCurrentSessionMessages = (newMessages, sessionId = currentSessionId) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return { ...session, messages: newMessages, timestamp: Date.now() };
      }
      return session;
    }));
  };

  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        setCurrentSessionId(null); // useEffect will catch this and create new
      }
    }
    toast.success('Chat deleted');
  };

  const renameSession = (sessionId, newTitle) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return { ...session, title: newTitle };
      }
      return session;
    }));
    toast.success('Chat renamed');
  };

  const generateTitle = async (userMessage, sessionId) => {
    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Generate a short, concise title (max 5 words) for the chat based on the user message provided. Do not use quotes or punctuation.' },
          { role: 'user', content: userMessage }
        ],
        model: currentModel,
        temperature: 0.5,
        max_tokens: 20,
      });

      const title = completion.choices[0]?.message?.content?.trim();
      if (title) {
        renameSession(sessionId, title);
      }
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback to truncation is handled by the initial state or previous logic if we want, 
      // but here we just fail silently and keep "New Chat" or the truncated version if we kept that logic.
    }
  };

  const handleSend = async (textInput) => {
    const messageContent = textInput || input;
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      toast.error('Please enter your API key');
      return;
    }

    // If no session is active (shouldn't happen but safe guard), create one
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = createNewSession();
    }

    const userMessage = { role: 'user', content: messageContent };

    // Optimistic update
    const updatedMessages = [...messages, userMessage];

    // Check if this is the first message to generate a title
    const isFirstMessage = messages.length === 0;

    // Update messages immediately
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return { ...session, messages: updatedMessages, timestamp: Date.now() };
      }
      return session;
    }));

    setInput('');
    setIsLoading(true);

    // Generate title in background if it's the first message
    if (isFirstMessage) {
      generateTitle(messageContent, activeSessionId);
    }

    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      // Sliding Window Logic: Keep last 10 messages to avoid context limits
      // Always include system prompt if set
      const recentMessages = updatedMessages.slice(-10);
      const apiMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...recentMessages]
        : recentMessages;

      const completion = await groq.chat.completions.create({
        messages: apiMessages,
        model: currentModel,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0]?.message || { role: 'assistant', content: 'No response from model.' };
      updateCurrentSessionMessages([...updatedMessages, assistantMessage], activeSessionId);
    } catch (error) {
      console.error('Error calling Groq API:', error);
      toast.error(`Error: ${error.message}`);
      // Don't add error message to chat history, just show toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!apiKey || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    let messagesToKeep = messages;

    if (lastMessage.role === 'assistant') {
      messagesToKeep = messages.slice(0, -1);
      const lastUserMessage = messagesToKeep[messagesToKeep.length - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user') return;
    } else {
      return;
    }

    updateCurrentSessionMessages(messagesToKeep);
    setIsLoading(true);

    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const recentMessages = messagesToKeep.slice(-10);
      const apiMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...recentMessages]
        : recentMessages;

      const completion = await groq.chat.completions.create({
        messages: apiMessages,
        model: currentModel,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0]?.message || { role: 'assistant', content: 'No response from model.' };
      updateCurrentSessionMessages([...messagesToKeep, assistantMessage]);
    } catch (error) {
      console.error('Error calling Groq API:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (index, newContent) => {
    if (!apiKey) return;

    // Truncate messages to keep everything *before* the edited message
    // The edited message itself will be replaced by the new user node
    const messagesToKeep = messages.slice(0, index);

    // Optimistic update
    const userMessage = { role: 'user', content: newContent };
    const updatedMessages = [...messagesToKeep, userMessage];

    updateCurrentSessionMessages(updatedMessages);
    setIsLoading(true);

    try {
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const recentMessages = updatedMessages.slice(-10);
      const apiMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...recentMessages]
        : recentMessages;

      const completion = await groq.chat.completions.create({
        messages: apiMessages,
        model: currentModel,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0]?.message || { role: 'assistant', content: 'No response from model.' };
      updateCurrentSessionMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Error calling Groq API:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      currentModel={currentModel}
      onSelectModel={setCurrentModel}
      onNewChat={createNewSession}
      onOpenSettings={() => setIsApiKeyModalOpen(true)}
      sessions={sessions}
      currentSessionId={currentSessionId}
      onSelectSession={(id) => {
        setCurrentSessionId(id);
        setCurrentView('chat');
      }}
      onDeleteSession={deleteSession}
      onRenameSession={renameSession}
      currentView={currentView}
      onViewChange={(view) => {
        setCurrentView(view);
        if (view === 'transcription' && !currentModel.includes('whisper')) {
          setCurrentModel('whisper-large-v3');
        } else if (view === 'tts' && !currentModel.includes('playai')) {
          setCurrentModel('playai-tts');
        } else if (view === 'chat' && (currentModel.includes('whisper') || currentModel.includes('playai'))) {
          setCurrentModel('moonshotai/kimi-k2-instruct-0905');
        }
      }}
    >
      <Toaster position="top-center" theme="dark" />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
      />

      {currentView === 'chat' ? (
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          input={input}
          setInput={setInput}
          onSend={() => handleSend(input)}
          onRegenerate={handleRegenerate}
          onEdit={handleEdit}
          apiKey={apiKey}
          systemPrompt={systemPrompt}
        />
      ) : currentView === 'transcription' ? (
        <TranscriptionInterface apiKey={apiKey} model={currentModel} />
      ) : (
        <TTSInterface apiKey={apiKey} model={currentModel} />
      )}
    </Layout>
  );
}

export default App;
