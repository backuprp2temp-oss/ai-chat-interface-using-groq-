import React, { useEffect, useRef } from 'react';

export function AudioVisualizer({ stream }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Initialize Web Audio API
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;

        sourceRef.current = audioContext.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!canvas) return;

            animationRef.current = requestAnimationFrame(draw);

            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgb(0, 0, 0, 0)'; // Transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Gradient color based on height
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#f97316'); // Orange-500
                gradient.addColorStop(1, '#a855f7'); // Purple-500

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            // Note: We don't close the AudioContext here as it might be expensive to recreate frequently,
            // but in a production app we might want to manage its lifecycle better.
            // For now, we'll just disconnect the source.
        };
    }, [stream]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={100}
            className="w-full h-full rounded-xl"
        />
    );
}
