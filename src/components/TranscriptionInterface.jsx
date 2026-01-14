import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, Square, FileAudio, Copy, Trash2, Loader2, Check, Download, History, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import Groq from 'groq-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioVisualizer } from './AudioVisualizer';
import { toast } from 'sonner';
import { saveTranscription, getAllTranscriptions, deleteTranscription } from '../lib/transcriptionStorage';

export function TranscriptionInterface({ apiKey, model }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [audioFile, setAudioFile] = useState(null);
    const [copied, setCopied] = useState(false);
    const [stream, setStream] = useState(null);
    const [history, setHistory] = useState([]);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const savedTranscriptions = await getAllTranscriptions();
                setHistory(savedTranscriptions);
            } catch (error) {
                console.error('Failed to load history:', error);
                toast.error('Failed to load history');
            }
        };
        loadHistory();
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            setAudioFile(file);
            setTranscription(null);
        } else {
            toast.error('Please upload an audio or video file.');
        }
    };

    const startRecording = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);
            mediaRecorderRef.current = new MediaRecorder(mediaStream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
                setAudioFile(file);
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscribe = async () => {
        if (!audioFile || !apiKey) {
            if (!apiKey) toast.error('API Key is required');
            return;
        }

        setIsTranscribing(true);
        try {
            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

            const response = await groq.audio.transcriptions.create({
                file: audioFile,
                model: model || 'whisper-large-v3',
                response_format: 'verbose_json',
                language: 'en',
                temperature: 0.0,
            });

            setTranscription(response);

            // Save to history
            const newHistoryItem = {
                id: Date.now(),
                text: response.text,
                segments: response.segments,
                fileName: audioFile.name,
                timestamp: new Date(),
                model: model || 'whisper-large-v3',
                duration: response.duration
            };

            await saveTranscription(newHistoryItem);
            setHistory(prev => [newHistoryItem, ...prev]);
            toast.success('Transcription complete and saved');

        } catch (error) {
            console.error('Error transcribing audio:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsTranscribing(false);
        }
    };

    const copyToClipboard = () => {
        if (!transcription) return;
        const text = transcription.text || '';
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied to clipboard');
    };

    const handleDownloadTranscript = () => {
        if (!transcription) return;
        const text = transcription.text || '';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Transcript downloaded');
    };

    const clearAll = () => {
        setAudioFile(null);
        setTranscription(null);
    };

    const handleDeleteHistory = async (e, id) => {
        e.stopPropagation();
        try {
            await deleteTranscription(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            if (transcription?.id === id) {
                setTranscription(null);
            }
            toast.success('Deleted from history');
        } catch (error) {
            console.error('Failed to delete history item:', error);
            toast.error('Failed to delete item');
        }
    };

    const loadFromHistory = (item) => {
        setTranscription({
            text: item.text,
            segments: item.segments,
            duration: item.duration
        });
        setAudioFile({ name: item.fileName, size: 0 }); // Mock file object for display
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-8 gap-8 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Audio Transcription
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Upload an audio file or record directly to transcribe using {model || 'Whisper Large V3'}.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-medium text-muted-foreground">
                    <History className="w-3.5 h-3.5" />
                    <span>{history.length} Transcriptions</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 flex-1 min-h-0">
                {/* Left Column: Input & History (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Input Section */}
                    <div className="flex flex-col gap-4">
                        <div
                            className={cn(
                                "flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 relative overflow-hidden min-h-[200px]",
                                dragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20 hover:bg-white/5",
                                audioFile ? "bg-primary/5 border-primary/50" : ""
                            )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                accept="audio/*,video/*"
                                onChange={handleChange}
                            />

                            <AnimatePresence mode="wait">
                                {isRecording ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="w-full h-full flex flex-col items-center justify-center gap-4"
                                    >
                                        <div className="w-full h-24 bg-black/20 rounded-xl overflow-hidden">
                                            <AudioVisualizer stream={stream} />
                                        </div>
                                        <p className="text-red-500 animate-pulse font-medium">Recording...</p>
                                    </motion.div>
                                ) : audioFile ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex flex-col items-center gap-4 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                            <FileAudio className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-lg truncate max-w-[200px]">{audioFile.name}</p>
                                            {audioFile.size > 0 && (
                                                <p className="text-sm text-muted-foreground">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => setAudioFile(null)}
                                                className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                                                title="Remove file"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex flex-col items-center gap-4 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-lg">Drag & drop audio</p>
                                            <p className="text-sm text-muted-foreground">or <label htmlFor="file-upload" className="text-primary hover:underline cursor-pointer">browse</label></p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-xs text-muted-foreground uppercase font-bold">OR</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                        </div>

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                                "w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium transition-all duration-300",
                                isRecording
                                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                    : "bg-white/5 hover:bg-white/10 text-foreground"
                            )}
                        >
                            {isRecording ? (
                                <>
                                    <Square className="w-5 h-5 fill-current" />
                                    Stop Recording
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5" />
                                    Start Recording
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleTranscribe}
                            disabled={!audioFile || isTranscribing}
                            className={cn(
                                "w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all duration-300 shadow-lg shadow-primary/20",
                                !audioFile || isTranscribing
                                    ? "bg-white/5 text-muted-foreground cursor-not-allowed shadow-none"
                                    : "bg-primary hover:bg-primary/90 hover:scale-[1.02]"
                            )}
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Transcribing...
                                </>
                            ) : (
                                <>
                                    <FileAudio className="w-5 h-5" />
                                    Transcribe Audio
                                </>
                            )}
                        </button>
                    </div>

                    {/* History List */}
                    <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex flex-col min-h-[300px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Transcriptions</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2 py-12">
                                    <History className="w-8 h-8" />
                                    <p className="text-sm">No history yet</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => loadFromHistory(item)}
                                        className="group flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 hover:border-white/5 transition-all duration-200 border border-transparent"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                            <FileAudio className="w-4 h-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-medium text-sm truncate text-foreground">
                                                    {item.fileName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate opacity-70">
                                                {item.text}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => handleDeleteHistory(e, item.id)}
                                            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Output (8 cols) */}
                <div className="lg:col-span-8 glass rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[600px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Transcription Output</h3>
                        {transcription && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadTranscript}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    title="Download Transcript"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    title="Clear output"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl p-4 font-mono text-sm leading-relaxed text-muted-foreground">
                        {transcription ? (
                            <div className="space-y-4">
                                {transcription.segments ? (
                                    transcription.segments.map((segment, idx) => (
                                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-1 text-xs text-primary/80">
                                                <span>[{formatTime(segment.start)} - {formatTime(segment.end)}]</span>
                                            </div>
                                            <p className="text-foreground">{segment.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="whitespace-pre-wrap text-foreground">{transcription.text}</p>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                                <FileAudio className="w-8 h-8 opacity-20" />
                                <p>Transcription will appear here...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

