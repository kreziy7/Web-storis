import React, { useState } from 'react';
import { useStoryStore } from '../store/storyStore';
import { PlusCircle, Image as ImageIcon, Video, Send, X, Loader2 } from 'lucide-react';

const StoryUpload = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', mediaUrl: '', mediaType: 'image' });
    const { createStory, isLoading } = useStoryStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createStory(formData);
            setFormData({ title: '', mediaUrl: '', mediaType: 'image' });
            setIsOpen(false);
        } catch (err) {
            console.error('Upload error:', err);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full h-24 glass-card border-dashed border-primary/30 flex items-center justify-center gap-4 group hover:border-primary transition-all duration-300"
            >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left">
                    <p className="text-lg font-black tracking-tight">Post New Story</p>
                    <p className="text-xs text-text-muted">Share your moment with the world</p>
                </div>
            </button>
        );
    }

    return (
        <div className="glass-card p-8 relative animate-in fade-in slide-in-from-top-4 duration-300">
            <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black italic">Create Story</h2>
                    <p className="text-sm text-text-muted">Fill in the details for your new story</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                        className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.mediaType === 'image'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-white/5 bg-white/5 text-text-muted hover:border-white/10'
                            }`}
                    >
                        <ImageIcon className="w-5 h-5" />
                        <span className="font-bold">Image</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                        className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.mediaType === 'video'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-white/5 bg-white/5 text-text-muted hover:border-white/10'
                            }`}
                    >
                        <Video className="w-5 h-5" />
                        <span className="font-bold">Video</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted mb-2 block">
                            Story Title
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="What's happening?"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all text-lg font-bold"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted mb-2 block">
                            Media URL
                        </label>
                        <input
                            type="url"
                            required
                            placeholder="https://images.unsplash.com/..."
                            value={formData.mediaUrl}
                            onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-mono text-sm"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-premium w-full flex items-center justify-center gap-3 py-5 text-lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Posting...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-6 h-6" />
                            <span>Publish Story</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default StoryUpload;
