import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { SparklesIcon, VfxIcon, ThumbnailIcon, BannerIcon, ChevronRightIcon, ClockIcon } from './Icons';

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getDatabase();

const OWNER_HANDLE = 'fuadeditingzone';

const RECOMMENDED_TAGS = [
    "YouTube Thumbnail", "VFX Animation", "Photo Manipulation", "AMV Edit", 
    "Channel Branding", "Social Media Post", "Logo Design", "Cinematic Montage",
    "Stream Overlay", "Color Grading", "Video Editing", "After Effects Shot"
];

const SERVICE_TIERS = [
  { id: 'vfx', name: 'Premium VFX', price: '50', icon: VfxIcon, delivery: '7' },
  { id: 'thumbnail', name: 'YT Thumbnails', price: '15', icon: ThumbnailIcon, delivery: '2' },
  { id: 'banner', name: 'Channel Branding', price: '25', icon: BannerIcon, delivery: '3' },
  { id: 'custom', name: 'Custom Order', price: '?', icon: SparklesIcon, delivery: '?' }
];

export const Contact: React.FC<{ onStartOrder: (platform: 'whatsapp' | 'email') => void }> = ({ onStartOrder }) => {
  const { isSignedIn, user } = useUser();
  const [intersectionRef] = useIntersectionObserver({ threshold: 0.1, triggerOnce: true });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [currency, setCurrency] = useState('$');
  const [tagWarning, setTagWarning] = useState<string | null>(null);
  const [formData, setFormData] = useState({ message: '', customName: '', customPrice: '', customTime: '' });
  const [userOrders, setUserOrders] = useState<any[]>([]);

  useEffect(() => {
    if (isSignedIn && user) {
      const ordersRef = ref(db, `orders/${user.id}`);
      onValue(ordersRef, (snap) => {
        const data = snap.val();
        if (data) setUserOrders(Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp));
      });
    }
  }, [isSignedIn, user]);

  const handleNumInput = (val: string, field: 'customPrice' | 'customTime') => {
      const numericVal = val.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [field]: numericVal });
  };

  const handleTagClick = (tag: string) => {
      setFormData({ ...formData, customName: tag });
      setTagWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !user || !selectedTier) return;
    
    if (selectedTier === 'custom' && !RECOMMENDED_TAGS.includes(formData.customName)) {
        setTagWarning("Select a tag from the catalog!");
        return;
    }

    const budgetVal = parseInt(formData.customPrice);
    if (isNaN(budgetVal) || budgetVal < 5) {
        alert("Minimum budget is $5");
        return;
    }

    setStatus('submitting');
    const isCustom = selectedTier === 'custom';
    const tier = SERVICE_TIERS.find(t => t.id === selectedTier);
    const orderKey = `order_${Date.now()}`;
    const serviceName = isCustom ? formData.customName : tier?.name;
    const finalPrice = isCustom ? formData.customPrice : tier?.price;
    const finalDelivery = isCustom ? formData.customTime : tier?.delivery;
    
    const orderData = {
      service: serviceName,
      message: formData.message,
      status: 'Pending',
      price: `${currency}${finalPrice}`,
      delivery: `${finalDelivery} Days`,
      timestamp: Date.now(),
      userName: user.fullName || user.username,
      userAvatar: user.imageUrl,
      userId: user.id
    };

    try {
      await set(ref(db, `orders/${user.id}/${orderKey}`), orderData);
      const usersSnap = await get(ref(db, 'users'));
      const ownerEntry = Object.values(usersSnap.val() || {}).find((u: any) => u.username === OWNER_HANDLE) as any;
      
      if (ownerEntry) {
          const ownerId = ownerEntry.id;
          await push(ref(db, `notifications/${ownerId}`), {
              type: 'new_order', fromId: user.id, fromName: user.fullName || user.username, fromAvatar: user.imageUrl,
              timestamp: Date.now(), read: false, orderName: serviceName, orderKey: orderKey
          });
          const chatPath = `messages/${[user.id, ownerId].sort().join('_')}`;
          await push(ref(db, chatPath), {
              senderId: user.id, senderName: user.fullName || user.username, senderAvatar: user.imageUrl,
              text: `[ORDER INQUIRY] New Project\nService: ${serviceName}\nBudget: ${currency}${finalPrice}\nDeadline: ${finalDelivery} Days\nDescription: ${formData.message}`,
              timestamp: Date.now()
          });
      }

      setStatus('success');
      setFormData({ message: '', customName: '', customPrice: '', customTime: '' });
      setSelectedTier(null);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) { setStatus('idle'); }
  };

  const cycleCurrency = () => {
    const symbols = ['$', '৳'];
    const idx = symbols.indexOf(currency);
    setCurrency(symbols[(idx + 1) % symbols.length]);
  };

  return (
    <section ref={intersectionRef} id="contact" className="py-20 md:py-28 bg-black relative z-10 overflow-hidden no-clip">
      <div className="container mx-auto px-6 md:px-8 max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-white text-3xl md:text-6xl font-black uppercase tracking-tight font-display">Order Database</h2>
          <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-[0.3em] font-bold mt-4">Secure Terminal • Project Initiation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-start">
          <form onSubmit={handleSubmit} className="flex flex-col gap-10 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {SERVICE_TIERS.map(tier => (
                    <button 
                      key={tier.id} 
                      onClick={(e) => { e.preventDefault(); setSelectedTier(tier.id); if(tier.id !== 'custom') setFormData(f => ({...f, customPrice: tier.price, customTime: tier.delivery})); }} 
                      className={`flex items-center gap-5 p-6 rounded-[1.8rem] border transition-all duration-300 bg-[#121212] ${selectedTier === tier.id ? 'border-red-600 shadow-[0_10px_30px_rgba(220,38,38,0.15)] bg-[#181818] scale-[1.03]' : 'border-transparent hover:bg-[#282828]'}`}
                    >
                        <div className={`p-4 rounded-xl flex-shrink-0 ${selectedTier === tier.id ? 'bg-red-600 text-white' : 'bg-[#282828] text-zinc-400'}`}>
                          <tier.icon className="w-8 h-8" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <h4 className="text-base md:text-lg font-bold text-white uppercase tracking-wider leading-tight truncate">{tier.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">
                            {tier.id === 'custom' ? 'Custom Quote' : `From ${currency}${tier.price}`}
                          </p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 md:p-12 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
                {!isSignedIn ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <SparklesIcon className="w-12 h-12 text-zinc-700 mb-6" />
                        <h3 className="text-white text-xl font-bold uppercase tracking-widest mb-10">Secure your spot in the queue</h3>
                        <SignInButton mode="modal">
                            <button className="w-full max-w-xs bg-white text-black py-6 rounded-full font-black uppercase tracking-[0.4em] text-[11px] shadow-xl hover:scale-105 transition-all active:scale-95 px-10">
                                Log In
                            </button>
                        </SignInButton>
                    </div>
                ) : (
                    <>
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Project Category Catalog</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {RECOMMENDED_TAGS.map(tag => (
                                    <button key={tag} type="button" onClick={() => handleTagClick(tag)} className={`px-4 py-3 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${formData.customName === tag ? 'bg-red-600 border-red-500 text-white shadow-lg scale-105' : 'bg-[#282828] border-transparent text-zinc-500 hover:text-white'}`}>{tag}</button>
                                ))}
                            </div>
                            {tagWarning && <p className="text-[10px] text-red-500 font-bold uppercase text-center mt-2 animate-pulse">{tagWarning}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Budget Setup</label>
                                <div className="relative group">
                                    <button type="button" onClick={cycleCurrency} className="absolute left-6 top-1/2 -translate-y-1/2 z-10 text-red-600 font-black text-2xl hover:scale-110 transition-transform">{currency}</button>
                                    <input required type="text" value={formData.customPrice} onChange={e => handleNumInput(e.target.value, 'customPrice')} placeholder="Min $5" className="w-full h-16 md:h-20 bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-xl font-bold text-white outline-none focus:border-red-600 transition-all text-center" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Protocol Deadline (Days)</label>
                                <div className="relative group">
                                    <input required type="text" value={formData.customTime} onChange={e => handleNumInput(e.target.value, 'customTime')} placeholder="0" className="w-full h-16 md:h-20 bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-xl font-bold text-white outline-none focus:border-red-600 transition-all text-center" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Project Transmission Details</label>
                            <textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-6 text-sm text-white focus:border-red-600 outline-none resize-none transition-all no-clip" placeholder="Describe the creative visual requirements..." />
                        </div>
                        
                        <div className="flex justify-center pt-4">
                            <button type="submit" disabled={status === 'submitting' || !selectedTier} className={`w-full max-w-sm py-6 rounded-full text-[11px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 ${!selectedTier ? 'bg-white/5 text-zinc-600' : 'bg-red-600 text-white shadow-xl hover:bg-red-700 hover:scale-[1.02] active:scale-95'}`}>
                                {status === 'submitting' ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Confirm Transmission'}
                            </button>
                        </div>
                    </>
                )}
            </div>
          </form>

          <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-inner flex flex-col h-full min-h-[600px] overflow-hidden">
                <div className="text-center mb-10 pb-8 border-b border-white/5 flex-shrink-0">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.2em] font-display">Transmission Logs</h3>
                    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mt-2">Personal Project Database</p>
                </div>
                <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-4">
                    {userOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                            <div className="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-8 border border-white/5">
                                <ClockIcon className="w-12 h-12 text-white" />
                            </div>
                            <p className="text-[10px] uppercase font-black tracking-[0.4em]">Standby • No signals detected</p>
                        </div>
                    ) : (
                        userOrders.map((order, idx) => (
                            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: idx * 0.05}} className="p-8 md:p-10 bg-black/40 border border-white/5 rounded-3xl hover:bg-black/60 transition-all duration-300 group cursor-default">
                                <div className="flex justify-between items-start mb-8 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-lg font-black text-white uppercase tracking-wider truncate no-clip">{order.service}</p>
                                        <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">{new Date(order.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-4 py-2 rounded-full border flex-shrink-0 ${order.status === 'Pending' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' : order.status === 'Accepted' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>{order.status}</span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-white/5 p-5 rounded-2xl border border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Protocol <span className="block text-white mt-1 text-sm">{order.price}</span></div>
                                    <div className="flex-1 bg-white/5 p-5 rounded-2xl border border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">ETA <span className="block text-white mt-1 text-sm">{order.delivery}</span></div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
          </div>
        </div>
      </div>
    </section>
  );
};