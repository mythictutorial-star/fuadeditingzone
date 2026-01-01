
import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isListening: boolean;
  isSpeaking: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ analyser, isListening, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      const color = isSpeaking ? '#dc2626' : (isListening ? '#ffffff' : '#4b5563');
      ctx.fillStyle = color;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Center the bars vertically
        const y = (canvas.height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser, isListening, isSpeaking]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={40} 
      className="w-full h-10 opacity-80"
    />
  );
};
