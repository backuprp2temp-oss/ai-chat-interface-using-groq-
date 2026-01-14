import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ModelSelector } from './ModelSelector';
import { Menu } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout({ children, currentModel, onSelectModel, onNewChat, onOpenSettings, sessions, currentSessionId, onSelectSession, onDeleteSession, onRenameSession, currentView, onViewChange }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onNewChat={onNewChat}
                onOpenSettings={onOpenSettings}
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={onSelectSession}
                onDeleteSession={onDeleteSession}
                onRenameSession={onRenameSession}
                currentView={currentView}
                onViewChange={onViewChange}
            />

            <div className={cn(
                "flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out",
                sidebarOpen ? "lg:ml-72" : "ml-0"
            )}>
                {/* Sticky Header */}
                <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="hidden md:block w-64">
                            <ModelSelector
                                currentModel={currentModel}
                                onSelectModel={onSelectModel}
                                isOpen={isModelSelectorOpen}
                                setIsOpen={setIsModelSelectorOpen}
                                mode={currentView === 'transcription' ? 'transcribe' : currentView === 'tts' ? 'tts' : 'chat'}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mobile Model Selector could go here or just hide it */}
                        <div className="md:hidden">
                            <span className="text-sm font-medium text-muted-foreground truncate max-w-[150px]">
                                {currentModel.split('/').pop()}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
