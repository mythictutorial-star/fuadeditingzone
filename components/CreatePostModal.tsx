
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, push, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
// Added ChevronRightIcon to the imports
import { CloseIcon, PhotoManipulationIcon, SendIcon, CheckCircleIcon, GlobeAltIcon, UserGroupIcon, EyeIcon, ChevronRightIcon } from './Icons';
import { Lock } from 'lucide-react';

const db = getDatabase();
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMarketplaceContext?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, isMarketplaceContext }) => {
  const { user } = useUser();
  const [role, setRole] = useState<'Designer' | 'Client'>('Designer');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState(['', '', '', '', '']);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>(isMarketplaceContext ? 'public' : 'public');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMarketplaceContext) setPrivacy('public');
  }, [isMarketplaceContext]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    setTags(newTags);
  };

  const handleSubmit = async () => {
    if (!user || !selectedFile || !title.trim()) return;
    setIsUploading(true);

    try {
      // 1. Update User Role globally in Firebase
      await update(ref(db, `users/${user.id}`), { role: role });

      // 2. Upload to R2
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', isMarketplaceContext ? 'Marketplace' : 'Community');
      const res = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
      const result = await res.json();

      // 3. Create Post Record
      const postData = {
        userId: user.id,
        userName: (user.username || user.fullName || '').toLowerCase(),
        userAvatar: user.imageUrl,
        userRole: role,
        mediaUrl: result.url,
        mediaType: selectedFile.type.startsWith('video') ? 'video' : 'image',
        title: title.trim(),
        caption: caption.trim(),
        tags: tags.filter(t => t.trim() !== ''),
        privacy: privacy,
        targetSection: isMarketplaceContext ? 'Marketplace Only' : 'Community',
        timestamp: Date.now(),
        likes: {},
        comments: {}
      };

      await push(ref(db, 'explore_posts'), postData);
      onClose();
    } catch (err) {
      alert("Failed to upload post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const privacyOptions = [
    { id: 'public', label: 'Public', desc: 'Visible in Marketplace and Profile.', icon: GlobeAltIcon, locked: false },
    { id: 'friends', label: 'Friends', desc: 'Only your friends can see this.', icon: UserGroupIcon, locked: isMarketplaceContext },
    { id: 'private', label: 'Only Me', desc: 'Only you can see this.', icon: EyeIcon, locked: isMarketplaceContext },
  ];

  return (
    <div className="fixed inset-0 z-[5000000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-3xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
              <PhotoManipulationIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Create New Post</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Fuad Editing Zone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-500"><CloseIcon className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          
          {/* Role Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Your Professional Role</label>
            <div className="flex gap-4">
              {['Designer', 'Client'].map((r) => (
                <button 
                  key={r} 
                  onClick={() => setRole(r as any)} 
                  className={`flex-1 py-4 rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all ${role === r ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Media Area */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Content Media</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-video w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group overflow-hidden ${previewUrl ? 'border-red-600/50 bg-black' : 'border-white/10 hover:border-red-600/40 bg-white/5'}`}
            >
              {previewUrl ? (
                selectedFile?.type.startsWith('video') ? (
                  <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="" />
                )
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-3xl text-zinc-700 group-hover:text-red-600 transition-colors mb-4"></i>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">Click to upload image or video</p>
                  <p className="text-[8px] text-zinc-700 uppercase font-bold mt-2">Max Size: 50MB</p>
                </>
              )}
              {previewUrl && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Change Media</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" hidden />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Post Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your work a name..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-red-600/50 transition-all placeholder-zinc-700" />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tags (Max 5)</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {tags.map((tag, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-black text-[10px]">#</span>
                    <input value={tag} onChange={e => handleTagChange(idx, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-2.5 text-[10px] text-white font-bold uppercase tracking-tight outline-none focus:border-red-600 transition-all" placeholder="TAG" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Caption</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe your creation..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-[100px] outline-none focus:border-red-600/50 transition-all resize-none placeholder-zinc-700" />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="relative">
             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Post Privacy</label>
             <button 
                onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
             >
                <div className="flex items-center gap-3">
                  {React.createElement(privacyOptions.find(o => o.id === privacy)?.icon || GlobeAltIcon, { className: 'w-5 h-5 text-red-600' })}
                  <div className="text-left">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest">{privacyOptions.find(o => o.id === privacy)?.label}</p>
                    <p className="text-[9px] text-zinc-500 font-medium">{privacyOptions.find(o => o.id === privacy)?.desc}</p>
                  </div>
                </div>
                <ChevronRightIcon className={`w-4 h-4 text-zinc-500 transition-transform ${isPrivacyOpen ? 'rotate-90' : ''}`} />
             </button>

             <AnimatePresence>
                {isPrivacyOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 right-0 mb-4 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20">
                    {privacyOptions.map((opt) => (
                      <button 
                        key={opt.id}
                        disabled={opt.locked}
                        onClick={() => { setPrivacy(opt.id as any); setIsPrivacyOpen(false); }}
                        className={`w-full flex items-center justify-between p-4 transition-all text-left border-b border-white/5 last:border-0 ${opt.locked ? 'opacity-30 cursor-not-allowed grayscale' : (privacy === opt.id ? 'bg-red-600/10' : 'hover:bg-white/5')}`}
                      >
                        <div className="flex items-center gap-3">
                          <opt.icon className={`w-5 h-5 ${privacy === opt.id ? 'text-red-600' : 'text-zinc-500'}`} />
                          <div>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${privacy === opt.id ? 'text-white' : 'text-zinc-400'}`}>{opt.label}</p>
                            <p className="text-[9px] text-zinc-600 font-medium">{opt.desc}</p>
                          </div>
                        </div>
                        {opt.locked ? <Lock className="w-3 h-3 text-zinc-600" /> : (privacy === opt.id && <CheckCircleIcon className="w-4 h-4 text-red-600" />)}
                      </button>
                    ))}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/60 backdrop-blur-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center md:text-left">By sharing, you agree to FEZ Zone's community guidelines.</p>
          <button 
            disabled={isUploading || !title.trim() || !selectedFile}
            onClick={handleSubmit}
            className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:grayscale text-white px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(220,38,38,0.4)] active:scale-95"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Share Content <SendIcon className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
