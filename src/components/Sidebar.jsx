import React, { useState, useEffect } from 'react';
import { Settings, Plus, MessageSquare, X, Trash2, FileAudio, Edit2, Check, Mic } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar({ isOpen, onClose, onNewChat, onOpenSettings, sessions = [], currentSessionId, onSelectSession, onDeleteSession, onRenameSession, currentView, onViewChange }) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const startEditing = (e, session) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    const saveTitle = (e) => {
        e.stopPropagation();
        if (editingId && editTitle.trim()) {
            onRenameSession(editingId, editTitle.trim());
        }
        setEditingId(null);
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveTitle(e);
        } else if (e.key === 'Escape') {
            cancelEditing(e);
        }
    };

    // Close sidebar on mobile when selecting a session
    const handleSelectSession = (id) => {
        onSelectSession(id);
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 left-0 w-72 glass z-50 flex flex-col border-r border-white/5"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent px-2">
                                Groq AI
                            </h2>
                            <button
                                onClick={onClose}
                                className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                                <button
                                    onClick={() => {
                                        onViewChange('chat');
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                        currentView === 'chat' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Chat
                                </button>
                                <button
                                    onClick={() => {
                                        onViewChange('transcription');
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                        currentView === 'transcription' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <FileAudio className="w-4 h-4" />
                                    Audio
                                </button>
                                <button
                                    onClick={() => {
                                        onViewChange('tts');
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                        currentView === 'tts' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <Mic className="w-4 h-4" />
                                    Speech
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    onNewChat();
                                    if (window.innerWidth < 1024) onClose();
                                }}
                                className="group flex items-center gap-3 w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-xl transition-all duration-300 text-primary"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-medium">New Chat</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
                            <div className="text-xs font-bold text-muted-foreground mb-4 px-2 uppercase tracking-wider">
                                Recent Chats
                            </div>
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "relative group rounded-xl transition-all duration-300",
                                            currentSessionId === session.id && currentView === 'chat'
                                                ? "bg-white/10 text-foreground shadow-lg"
                                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                        )}
                                    >
                                        {editingId === session.id ? (
                                            <div className="flex items-center gap-2 px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary/50"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button onClick={saveTitle} className="p-1 hover:text-green-400"><Check className="w-3 h-3" /></button>
                                                <button onClick={cancelEditing} className="p-1 hover:text-red-400"><X className="w-3 h-3" /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleSelectSession(session.id)}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left pr-16"
                                            >
                                                <MessageSquare className={cn(
                                                    "w-4 h-4 transition-opacity shrink-0",
                                                    currentSessionId === session.id && currentView === 'chat' ? "opacity-100 text-primary" : "opacity-50 group-hover:opacity-100"
                                                )} />
                                                <span className="truncate">{session.title || 'New Chat'}</span>
                                            </button>
                                        )}

                                        {!editingId && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => startEditing(e, session)}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                                                    title="Edit Title"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => onDeleteSession(e, session.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {sessions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground/50 text-sm">
                                        No recent chats
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => {
                                    onOpenSettings();
                                    if (window.innerWidth < 1024) onClose();
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-all duration-300 group"
                            >
                                <Settings className="w-5 h-5 group-hover:text-primary transition-colors" />
                                <span className="font-medium">Settings</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
