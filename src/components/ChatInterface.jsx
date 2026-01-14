import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, Loader2, Copy, Check, RotateCw, Sparkles, Terminal, Mail, Code, Download, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { VoiceInput } from './VoiceInput';
import { toast } from 'sonner';

const STARTER_CARDS = [
    { icon: Mail, label: "Draft an email", prompt: "Draft a professional email to a client about a project delay." },
    { icon: Code, label: "Debug code", prompt: "Help me debug a React component that isn't re-rendering." },
    { icon: Terminal, label: "Explain a concept", prompt: "Explain quantum computing in simple terms." },
    { icon: Sparkles, label: "Creative writing", prompt: "Write a short sci-fi story about a robot who loves gardening." },
];

export function ChatInterface({ messages, isLoading, input, setInput, onSend, onRegenerate, onEdit, apiKey }) {
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState(null);
    const [editContent, setEditContent] = useState('');

    const scrollToBottom = () => {
        if (!isUserScrolledUp) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isUserScrolledUp]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsUserScrolledUp(!isNearBottom);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleCopy = (content, idx) => {
        navigator.clipboard.writeText(content);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success('Copied to clipboard');
    };

    const handleDownloadChat = () => {
        if (messages.length === 0) {
            toast.error('No chat to download');
            return;
        }
        const chatContent = messages.map(m => `${m.role.toUpperCase()}:\n${m.content}\n`).join('\n---\n\n');
        const blob = new Blob([chatContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Chat downloaded');
    };

    const handleCardClick = (prompt) => {
        setInput(prompt);
    };

    const startEditing = (index, content) => {
        setEditingMessageIndex(index);
        setEditContent(content);
    };

    const cancelEditing = () => {
        setEditingMessageIndex(null);
        setEditContent('');
    };

    const saveEdit = (index) => {
        if (!editContent.trim()) {
            toast.error('Message cannot be empty');
            return;
        }
        onEdit(index, editContent);
        setEditingMessageIndex(null);
        setEditContent('');
    };

    const CodeBlock = ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        if (!inline && match) {
            return (
                <div className="relative group/code my-6 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#1e1e1e]">
                    {/* Mac-style Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border-b border-black/50">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono font-medium">{match[1]}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(codeString);
                                    toast.success('Code copied');
                                }}
                                className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                background: '#1e1e1e',
                                padding: '1.5rem',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                fontFamily: '"JetBrains Mono", monospace'
                            }}
                            {...props}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                </div>
            );
        }
        return (
            <code className={cn("bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-primary/90", className)} {...props}>
                {children}
            </code>
        );
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Header / Toolbar */}
            <div className="absolute top-4 right-4 z-10">
                {messages.length > 0 && (
                    <button
                        onClick={handleDownloadChat}
                        className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                        title="Download Chat"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground max-w-2xl mx-auto">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative mb-8"
                        >
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-slow"></div>
                            <div className="relative bg-gradient-to-br from-gray-900 to-black p-6 rounded-3xl border border-white/10 shadow-2xl">
                                <Bot className="w-16 h-16 text-primary" />
                            </div>
                        </motion.div>
                        <motion.h3
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-8 text-center"
                        >
                            How can I help?
                        </motion.h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                            {STARTER_CARDS.map((card, idx) => (
                                <motion.button
                                    key={idx}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    onClick={() => handleCardClick(card.prompt)}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/20 transition-all duration-300 text-left group"
                                >
                                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                                        <card.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{card.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-8 pt-8 px-4">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-4 w-full group relative",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={cn(
                                    "rounded-2xl px-6 py-4 text-base leading-relaxed shadow-sm relative group/msg transition-all duration-200",
                                    msg.role === 'user'
                                        ? "bg-white/10 text-foreground rounded-tr-sm max-w-[85%] md:max-w-[70%]"
                                        : "bg-transparent text-gray-100 rounded-tl-sm w-full max-w-[95%]",
                                    editingMessageIndex === idx ? "w-full max-w-full bg-white/5 border border-primary/20" : ""
                                )}>
                                    {editingMessageIndex === idx ? (
                                        <div className="flex flex-col gap-3">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none text-base leading-relaxed p-0 min-h-[60px]"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => saveEdit(idx)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Save & Submit
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-foreground rounded-md text-sm hover:bg-white/20 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={cn(
                                                "prose prose-invert prose-base max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none prose-headings:text-foreground/90 prose-strong:text-foreground",
                                                msg.role === 'assistant' ? "" : "whitespace-pre-wrap"
                                            )}>
                                                {msg.role === 'assistant' ? (
                                                    <ReactMarkdown
                                                        components={{
                                                            code: CodeBlock
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>

                                            {/* Copy/Regen buttons for Assistant */}
                                            {msg.role === 'assistant' && (
                                                <div className="flex gap-3 mt-4 pt-3 border-t border-white/5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleCopy(msg.content, idx)}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
                                                    >
                                                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        {copiedIndex === idx ? 'Copied' : 'Copy'}
                                                    </button>
                                                    {idx === messages.length - 1 && !isLoading && (
                                                        <button
                                                            onClick={onRegenerate}
                                                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" />
                                                            Regenerate
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Tools for User (Outside bubble) */}
                                {msg.role === 'user' && !editingMessageIndex && (
                                    <div className="flex flex-col gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -left-10 top-2">
                                        <button
                                            onClick={() => startEditing(idx, msg.content)}
                                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                                            title="Edit Message"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleCopy(msg.content, idx)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                                            title="Copy"
                                        >
                                            {copiedIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                )}

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-1">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-4 justify-start w-full max-w-5xl mx-auto px-4"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-slate-900/50 border border-white/5 px-6 py-5 rounded-2xl rounded-tl-sm flex items-center gap-4 shadow-lg">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground animate-pulse">Thinking...</span>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 lg:p-6 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20">
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative flex items-end gap-2 bg-[#0a0a0a] rounded-2xl p-2 border border-white/10 shadow-2xl">

                        <VoiceInput apiKey={apiKey} onTranscribe={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)} />

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Groq AI..."
                            className="w-full py-3 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none min-h-[48px] max-h-[200px] custom-scrollbar text-base leading-relaxed"
                            rows={1}
                        />
                        <button
                            onClick={onSend}
                            disabled={!input.trim() || isLoading}
                            className="mb-1 p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground/40">
                            AI can make mistakes. Check important info.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
