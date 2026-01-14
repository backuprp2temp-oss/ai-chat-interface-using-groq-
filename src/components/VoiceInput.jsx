import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import Groq from 'groq-sdk';
import { cn } from '../lib/utils';

export function VoiceInput({ apiKey, onTranscribe, disabled }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await handleTranscribe(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscribe = async (audioBlob) => {
        if (!apiKey) {
            alert('Please set your API key first.');
            return;
        }

        setIsTranscribing(true);
        try {
            const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
            const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

            const transcription = await groq.audio.transcriptions.create({
                file: file,
                model: 'whisper-large-v3',
            });

            onTranscribe(transcription.text);
        } catch (error) {
            console.error('Error transcribing audio:', error);
            alert(`Error transcribing audio: ${error.message}`);
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isTranscribing}
            className={cn(
                "p-2 rounded-xl transition-all duration-300 flex items-center justify-center",
                isRecording
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            title={isRecording ? "Stop Recording" : "Start Voice Input"}
        >
            {isTranscribing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
                <Square className="w-5 h-5 fill-current" />
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </button>
    );
}
