
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, push, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
// Removed missing PlusSquare from ./Icons
import { CloseIcon, PhotoManipulationIcon, SendIcon, CheckCircleIcon, GlobeAltIcon, UserGroupIcon, EyeIcon, ChevronRightIcon } from './Icons';
import { Lock, Trash2, Plus } from 'lucide-react';

const db = getDatabase();
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMarketplaceContext?: boolean;
}

interface ExternalLink {
  name: string;
  url: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, isMarketplaceContext }) => {
  const { user } = useUser();
  const [role, setRole] = useState<'Designer' | 'Client/Visitor'>('Designer');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState(['', '', '', '', '']);
  const [caption, setCaption] = useState('');
  const [links, setLinks] = useState<ExternalLink[]>([]);
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

  const addLink = () => {
    if (links.length >= 10) return;
    setLinks([...links, { name: '', url: '' }]);
  };

  const updateLink = (index: number, field: keyof ExternalLink, value: string) => {
    const newLinks = [...links];
    if (field === 'name') {
      const words = value.trim().split(/\s+/);
      if (words.length > 5) return;
    }
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    if (role === 'Designer' && !selectedFile) return;
    
    setIsUploading(true);

    try {
      const storedRole = role === 'Client/Visitor' ? 'Client' : 'Designer';
      await update(ref(db, `users/${user.id}`), { role: storedRole });

      let mediaUrl = '';
      let mediaType = 'text';

      if (role === 'Designer' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('folder', isMarketplaceContext ? 'Marketplace' : 'Community');
        const res = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
        const result = await res.json();
        mediaUrl = result.url;
        mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
      }

      const postData = {
        userId: user.id,
        userName: (user.username || user.fullName || '').toLowerCase(),
        userAvatar: user.imageUrl,
        userRole: role,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        title: title.trim(),
        caption: caption.trim(),
        tags: tags.filter(t => t.trim() !== ''),
        links: role === 'Client/Visitor' ? links.filter(l => l.name.trim() && l.url.trim()) : [],
        privacy: privacy,
        targetSection: isMarketplaceContext ? 'Marketplace Only' : 'Community',
        timestamp: Date.now(),
        likes: {},
        comments: {}
      };

      await push(ref(db, 'explore_posts'), postData);
      onClose();
    } catch (err) {
      alert("Something went wrong while posting. Try again.");
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
    <div className="fixed inset-0 z-[5000000] flex items-center justify-center bg-black/95">
      <motion.div 
        initial={{ y: "100%", opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: "100%", opacity: 0 }} 
        transition={{ type: "spring", damping: 30, stiffness: 300 }} 
        className="w-full h-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 flex-shrink-0 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
              <PhotoManipulationIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">New Post</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">FEZ Creative Zone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/5 transition-colors text-zinc-500"><CloseIcon className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col md:flex-row gap-12 lg:gap-20">
            
            {/* Left Column: Category & Content */}
            <div className="md:w-5/12 lg:w-4/12 space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Post Category</label>
                <div className="flex gap-3">
                  {['Designer', 'Client/Visitor'].map((r) => (
                    <button 
                      key={r} 
                      onClick={() => setRole(r as any)} 
                      className={`flex-1 py-4 rounded-xl border font-black text-[10px] md:text-[11px] uppercase tracking-widest transition-all ${role === r ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'Designer' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Upload Content</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-full h-40 md:h-80 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group overflow-hidden ${previewUrl ? 'border-red-600/50 bg-black' : 'border-white/10 hover:border-red-600/40 bg-white/5'}`}
                  >
                    {previewUrl ? (
                      selectedFile?.type.startsWith('video') ? (
                        <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <img src={previewUrl} className="w-full h-full object-cover" alt="" />
                      )
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-3xl md:text-4xl text-zinc-700 group-hover:text-red-600 transition-colors mb-3 md:mb-4"></i>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">Tap to choose work</p>
                      </>
                    )}
                    {previewUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Replace Media</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" hidden />
                </div>
              )}
            </div>

            {/* Right Column: Details & Settings */}
            <div className="md:w-7/12 lg:w-8/12 space-y-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Work Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give it a name..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white font-bold outline-none focus:border-red-600/50 transition-all placeholder-zinc-800" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Search Tags (5 MAX)</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {tags.map((tag, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-black text-[10px]">#</span>
                        <input value={tag} onChange={e => handleTagChange(idx, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-3 text-[9px] md:text-[10px] text-white font-bold uppercase tracking-tight outline-none focus:border-red-600 transition-all" placeholder="TAG" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe your masterpiece..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white min-h-[160px] outline-none focus:border-red-600/50 transition-all resize-none placeholder-zinc-800" />
                </div>
              </div>

              {/* Privacy */}
              <div className="relative">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Post Visibility</label>
                 <button 
                    onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                    className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                 >
                    <div className="flex items-center gap-4">
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
                            className={`w-full flex items-center justify-between p-5 transition-all text-left border-b border-white/5 last:border-0 ${opt.locked ? 'opacity-30 cursor-not-allowed grayscale' : (privacy === opt.id ? 'bg-red-600/10' : 'hover:bg-white/5')}`}
                          >
                            <div className="flex items-center gap-4">
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

              {/* Links (Only for Client) */}
              {role === 'Client/Visitor' && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">External Links</label>
                    <button onClick={addLink} className="p-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition-colors shadow-lg">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {links.map((link, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                        <div className="w-full sm:flex-1 space-y-2">
                           <p className="text-[8px] text-zinc-600 font-black uppercase">Name (Max 5 words)</p>
                           <input value={link.name} onChange={e => updateLink(idx, 'name', e.target.value)} placeholder="e.g. My Website" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-red-600 transition-all" />
                        </div>
                        <div className="w-full sm:flex-[2] space-y-2">
                           <p className="text-[8px] text-zinc-600 font-black uppercase">URL</p>
                           <input value={link.url} onChange={e => updateLink(idx, 'url', e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-red-600 transition-all" />
                        </div>
                        <button onClick={() => removeLink(idx)} className="p-3 text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {links.length === 0 && (
                      <p className="text-center py-10 text-[10px] text-zinc-600 font-black uppercase tracking-widest border border-dashed border-white/10 rounded-xl">No links added yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-10 border-t border-white/10 bg-black/80 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between pb-12 md:pb-10">
          <p className="hidden md:block text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center md:text-left">Friendly reminder: Stick to the community guidelines. Sharing high quality content helps everyone.</p>
          <button 
            disabled={isUploading || !title.trim() || (role === 'Designer' && !selectedFile)}
            onClick={handleSubmit}
            className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:grayscale text-white px-16 py-5 rounded-xl text-[12px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(220,38,38,0.4)] active:scale-95"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Share Content <SendIcon className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
