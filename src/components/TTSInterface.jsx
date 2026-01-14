import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Download, Loader2, Volume2, Trash2, User, Clock, FastForward, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import WaveSurfer from 'wavesurfer.js';
import { saveTrack, getAllTracks, deleteTrack } from '../lib/audioStorage';

const PLAYAI_VOICES = [
    "Angelo-PlayAI", "Aaliyah-PlayAI", "Adelaide-PlayAI", "Arista-PlayAI", "Atlas-PlayAI",
    "Basil-PlayAI", "Briggs-PlayAI", "Calum-PlayAI", "Celeste-PlayAI", "Cheyenne-PlayAI",
    "Chip-PlayAI", "Cillian-PlayAI", "Deedee-PlayAI", "Eleanor-PlayAI", "Fritz-PlayAI",
    "Gail-PlayAI", "Indigo-PlayAI", "Jennifer-PlayAI", "Judy-PlayAI", "Mamaw-PlayAI",
    "Mason-PlayAI", "Mikail-PlayAI", "Mitch-PlayAI", "Nia-PlayAI", "Quinn-PlayAI",
    "Ruby-PlayAI", "Thunder-PlayAI"
];

const MAX_CHARS = 1000;

export function TTSInterface({ apiKey, model }) {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState(PLAYAI_VOICES[0]);
    const [isLoading, setIsLoading] = useState(false);

    // History State: [{ id, text, voice, url, timestamp, duration }]
    const [history, setHistory] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);

    // WaveSurfer State
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Load history from IndexedDB on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const tracks = await getAllTracks();
                setHistory(tracks);
                if (tracks.length > 0) {
                    setCurrentTrack(tracks[0]);
                }
            } catch (error) {
                console.error('Failed to load history:', error);
                toast.error('Failed to load history');
            }
        };
        loadHistory();
    }, []);

    // Initialize WaveSurfer and handle track changes
    useEffect(() => {
        if (currentTrack && waveformRef.current) {
            if (wavesurfer.current) {
                wavesurfer.current.destroy();
            }

            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: 'rgba(255, 255, 255, 0.2)',
                progressColor: '#a855f7', // Purple-500
                cursorColor: '#d8b4fe',
                barWidth: 2,
                barGap: 3,
                height: 128,
                responsive: true,
                normalize: true,
                backend: 'WebAudio',
            });

            wavesurfer.current.on('finish', () => setIsPlaying(false));
            wavesurfer.current.on('play', () => setIsPlaying(true));
            wavesurfer.current.on('pause', () => setIsPlaying(false));

            wavesurfer.current.load(currentTrack.url);

            const onReady = () => {
                wavesurfer.current.play();
            };
            wavesurfer.current.once('ready', onReady);

            return () => {
                if (wavesurfer.current) {
                    wavesurfer.current.un('ready', onReady);
                    wavesurfer.current.destroy();
                    wavesurfer.current = null;
                }
            };
        }
    }, [currentTrack]);

    const handleGenerate = async () => {
        if (!text.trim()) {
            toast.error('Please enter some text');
            return;
        }
        if (text.length > MAX_CHARS) {
            toast.error(`Text exceeds ${MAX_CHARS} characters`);
            return;
        }
        if (!apiKey) {
            toast.error('API Key is required');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || 'playai-tts',
                    input: text,
                    voice: voice,
                    response_format: 'mp3'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const newTrack = {
                id: Date.now(),
                text: text,
                voice: voice,
                url: url,
                timestamp: new Date(),
            };

            // Save to IndexedDB
            await saveTrack(newTrack);

            setHistory(prev => [newTrack, ...prev]);
            setCurrentTrack(newTrack);
            toast.success('Audio generated successfully');
            setText(''); // Optional: clear text after generation

        } catch (error) {
            console.error('Error generating speech:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlayPause = () => {
        if (wavesurfer.current) {
            wavesurfer.current.playPause();
        }
    };

    const toggleSpeed = () => {
        const speeds = [0.5, 1, 1.5, 2];
        const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];
        setPlaybackSpeed(newSpeed);
        if (wavesurfer.current) {
            wavesurfer.current.setPlaybackRate(newSpeed);
        }
    };

    const handleDownload = (track) => {
        if (!track?.url) return;
        const a = document.createElement('a');
        a.href = track.url;
        a.download = `voice-studio-${track.id}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await deleteTrack(id);
            const track = history.find(t => t.id === id);
            if (track) {
                URL.revokeObjectURL(track.url);
            }
            setHistory(prev => prev.filter(t => t.id !== id));
            if (currentTrack?.id === id) {
                setCurrentTrack(null);
                if (wavesurfer.current) {
                    wavesurfer.current.empty();
                }
            }
        } catch (error) {
            console.error('Failed to delete track:', error);
            toast.error('Failed to delete track');
        }
    };

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-8 gap-8 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Voice Studio
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create lifelike speech with {model || 'PlayAI TTS'}
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-medium text-muted-foreground">
                    <History className="w-3.5 h-3.5" />
                    <span>{history.length} Generations</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 flex-1 min-h-0">
                {/* Left Column: Controls (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Voice Selector */}
                    <div className="space-y-2 shrink-0">
                        <label className="text-sm font-medium text-muted-foreground ml-1">Voice Model</label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center gap-3 bg-[#1a1f2e] p-3 rounded-xl border border-white/10 hover:border-primary/30 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <select
                                    value={voice}
                                    onChange={(e) => setVoice(e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 text-sm w-full text-foreground [&>option]:bg-[#1a1f2e] cursor-pointer"
                                >
                                    {PLAYAI_VOICES.map(v => (
                                        <option key={v} value={v}>{v.replace('-PlayAI', '')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Text Input */}
                    <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-sm font-medium text-muted-foreground">Script</label>
                            <span className={cn(
                                "text-xs font-mono",
                                text.length > MAX_CHARS ? "text-red-500 font-bold" : "text-muted-foreground/50"
                            )}>
                                {text.length} / {MAX_CHARS}
                            </span>
                        </div>
                        <div className="flex-1 relative group">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type something amazing..."
                                className={cn(
                                    "w-full h-full p-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-1 transition-all resize-none custom-scrollbar text-base leading-relaxed",
                                    text.length > MAX_CHARS
                                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-white/10 focus:border-primary/50 focus:ring-primary/50"
                                )}
                            />
                            {text && (
                                <button
                                    onClick={() => setText('')}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                    title="Clear text"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!text.trim() || text.length > MAX_CHARS || isLoading}
                        className={cn(
                            "w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white transition-all duration-300 shadow-lg shrink-0",
                            !text.trim() || text.length > MAX_CHARS || isLoading
                                ? "bg-white/5 text-muted-foreground cursor-not-allowed shadow-none"
                                : "bg-gradient-to-r from-primary to-purple-600 hover:scale-[1.02] shadow-primary/25"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating Audio...
                            </>
                        ) : (
                            <>
                                <Volume2 className="w-5 h-5" />
                                Generate Speech
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Studio (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Main Player */}
                    <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600 opacity-20"></div>

                        {currentTrack ? (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                                            {currentTrack.voice.replace('-PlayAI', '')}
                                            <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                                {new Date(currentTrack.timestamp).toLocaleTimeString()}
                                            </span>
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1 max-w-md">
                                            {currentTrack.text}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(currentTrack)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white"
                                        title="Download MP3"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Waveform Container */}
                                <div className="relative py-4">
                                    <div ref={waveformRef} className="w-full" />
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-center gap-6">
                                    <button
                                        onClick={toggleSpeed}
                                        className="text-xs font-mono font-medium text-muted-foreground hover:text-white w-12 transition-colors"
                                        title="Playback Speed"
                                    >
                                        {playbackSpeed}x
                                    </button>

                                    <button
                                        onClick={togglePlayPause}
                                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-6 h-6 fill-current" />
                                        ) : (
                                            <Play className="w-6 h-6 fill-current ml-1" />
                                        )}
                                    </button>

                                    <div className="w-12"></div> {/* Spacer for balance */}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                    <Volume2 className="w-10 h-10" />
                                </div>
                                <p className="font-medium">Ready to create</p>
                            </div>
                        )}
                    </div>

                    {/* History Playlist */}
                    <div className="flex-1 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex flex-col min-h-[300px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Generations</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2 py-12">
                                    <History className="w-8 h-8" />
                                    <p className="text-sm">No history yet</p>
                                </div>
                            ) : (
                                history.map((track) => (
                                    <div
                                        key={track.id}
                                        onClick={() => setCurrentTrack(track)}
                                        className={cn(
                                            "group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent",
                                            currentTrack?.id === track.id
                                                ? "bg-primary/10 border-primary/20"
                                                : "hover:bg-white/5 hover:border-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                            currentTrack?.id === track.id ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                                        )}>
                                            {currentTrack?.id === track.id && isPlaying ? (
                                                <div className="flex gap-0.5 items-end h-3">
                                                    <div className="w-1 bg-current animate-[bounce_1s_infinite] h-2"></div>
                                                    <div className="w-1 bg-current animate-[bounce_1.2s_infinite] h-3"></div>
                                                    <div className="w-1 bg-current animate-[bounce_0.8s_infinite] h-1.5"></div>
                                                </div>
                                            ) : (
                                                <Play className="w-4 h-4 ml-0.5" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={cn(
                                                    "font-medium text-sm truncate",
                                                    currentTrack?.id === track.id ? "text-primary" : "text-foreground"
                                                )}>
                                                    {track.voice.replace('-PlayAI', '')}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(track.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate opacity-70">
                                                {track.text}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => handleDelete(e, track.id)}
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
            </div>
        </div>
    );
}
