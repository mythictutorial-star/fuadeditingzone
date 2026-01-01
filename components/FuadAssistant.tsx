import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { siteConfig } from '../config';
import { 
  CloseIcon, 
  MicrophoneIcon, 
  VolumeOnIcon, 
  VolumeOffIcon, 
  SparklesIcon,
  ChatBubbleIcon
} from './Icons';
import { WaveformVisualizer } from './WaveformVisualizer';

// Voice options available in Gemini Live API
const VOICES = [
  { id: 'Zephyr', name: 'Zephyr (Deep)' },
  { id: 'Puck', name: 'Puck (Youthful)' },
  { id: 'Charon', name: 'Charon (Calm)' },
  { id: 'Kore', name: 'Kore (Soft)' },
  { id: 'Fenrir', name: 'Fenrir (Strong)' }
];

export const FuadAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [transcripts, setTranscripts] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Base64 Helpers as per guidelines
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startSession = async () => {
    if (isConnected) return;

    try {
      // FIX: Strictly use process.env.API_KEY directly as per Google GenAI coding guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const analyser = inputCtx.createAnalyser();
      inputAnalyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                if (text) {
                    setTranscripts(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'user') {
                            return [...prev.slice(0, -1), { role: 'user', text: last.text + ' ' + text }];
                        }
                        return [...prev, { role: 'user', text }];
                    });
                    setIsListening(true);
                }
            }

            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                if (text) {
                    setTranscripts(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'bot') {
                            return [...prev.slice(0, -1), { role: 'bot', text: last.text + text }];
                        }
                        return [...prev, { role: 'bot', text }];
                    });
                }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const s of sourcesRef.current) {
                try { s.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
                setIsListening(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsListening(false);
            setIsSpeaking(false);
          },
          onerror: (e) => console.error('AI Error:', e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: `You are the creative assistant for Fuad Ahmed (Selected Legend), owner of Fuad Editing Zone (FEZ). 
          You are professional, helpful, and creative. You represent Fuad's high-quality standards in VFX and Graphic Design. 
          Help users understand his services like Photo Manipulation, YouTube Thumbnails, and AMV editing. 
          The user is currently browsing his portfolio website. Be concise and conversational.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start AI session", err);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[320px] md:w-[400px] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-red-600/10 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-red-600/50">
                  <img src={siteConfig.branding.logoUrl} alt="FEZ" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">FEZ Assistant</h4>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {isConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content / Transcripts */}
            <div className="flex-1 h-[300px] overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <SparklesIcon className="w-8 h-8 text-red-600 mb-3 opacity-50" />
                  <p className="text-xs text-gray-500 font-medium">
                    Hello! I'm Fuad's creative AI assistant. 
                    {isConnected ? ' Speak to me and I\'ll help you explore the FEZ Zone!' : ' Click "Connect" to start talking.'}
                  </p>
                </div>
              ) : (
                transcripts.map((t, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: t.role === 'user' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-3 rounded-xl text-xs ${t.role === 'user' ? 'bg-white/10 text-white rounded-br-none' : 'bg-red-600/10 border border-red-600/20 text-gray-200 rounded-bl-none'}`}>
                      {t.text}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Voice Visualizer */}
            <div className="px-4 py-2 border-t border-white/5 bg-black/60">
              <WaveformVisualizer 
                analyser={inputAnalyserRef.current} 
                isListening={isListening} 
                isSpeaking={isSpeaking} 
              />
            </div>

            {/* Footer / Controls */}
            <div className="p-4 bg-black border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] no-scrollbar">
                  {VOICES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border transition-all whitespace-nowrap ${selectedVoice === v.id ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={isConnected ? stopSession : startSession}
                className={`w-full btn-angular flex items-center justify-center gap-3 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all ${isConnected ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'}`}
              >
                {isConnected ? (
                  <>Stop Connection</>
                ) : (
                  <>
                    <MicrophoneIcon className="w-4 h-4" />
                    Connect & Chat
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'bg-white text-black' : 'bg-red-600 text-white'} relative`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <CloseIcon className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <ChatBubbleIcon className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {isConnected && !isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse"></span>
        )}
      </motion.button>
    </div>
  );
};