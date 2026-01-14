import React from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const models = [
    { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B' },
    { id: 'groq/compound', name: 'Groq Compound' },
    { id: 'groq/compound-mini', name: 'Groq Compound Mini' },
    { id: 'Llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'Llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
    { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B' },
    { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
    { id: 'openai/gpt-oss-safeguard-20b', name: 'GPT OSS Safeguard 20B' },
    { id: 'whisper-large-v3', name: 'Whisper Large V3' },
    { id: 'whisper-large-v3-turbo', name: 'Whisper Large V3 Turbo' },
    { id: 'playai-tts', name: 'PlayAI TTS' },
    { id: 'playai-tts-arabic', name: 'PlayAI TTS Arabic' },
];

export function ModelSelector({ currentModel, onSelectModel, isOpen, setIsOpen, mode = 'chat' }) {
    const filteredModels = models.filter(m => {
        if (mode === 'transcribe') return m.id.includes('whisper');
        if (mode === 'tts') return m.id === 'playai-tts' || m.id === 'playai-tts-arabic';
        return !m.id.includes('whisper') && !m.id.includes('playai');
    });

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-left bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 border border-white/5 hover:border-white/10 group",
                    isOpen && "border-primary/50 bg-white/10 ring-2 ring-primary/20"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium truncate text-sm">
                        {models.find(m => m.id === currentModel)?.name || currentModel}
                    </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {filteredModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors relative group",
                                        currentModel === model.id
                                            ? "bg-primary/20 text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <span className="truncate relative z-10">{model.name}</span>
                                    {currentModel === model.id && (
                                        <motion.div
                                            layoutId="check"
                                            className="relative z-10"
                                        >
                                            <Check className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                    {currentModel === model.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
