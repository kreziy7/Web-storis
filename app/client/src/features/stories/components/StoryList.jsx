import React, { useEffect } from 'react';
import { useStoryStore } from '../store/storyStore';
import StoryCard from './StoryCard';
import { Loader2 } from 'lucide-react';

const StoryList = () => {
    const { stories, fetchStories, isLoading, error } = useStoryStore();

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    if (isLoading && stories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-text-muted font-medium animate-pulse">Gathering stories...</p>
            </div>
        );
    }

    if (error && stories.length === 0) {
        return (
            <div className="glass-card p-10 text-center border-accent/20">
                <p className="text-accent font-bold text-lg mb-4">Oops! Something went wrong.</p>
                <p className="text-text-muted mb-6">{error}</p>
                <button
                    onClick={fetchStories}
                    className="btn-premium from-accent to-red-500"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <div className="glass-card p-20 text-center border-dashed border-white/10">
                <p className="text-2xl font-black mb-2">No Stories Yet</p>
                <p className="text-text-muted">Be the first one to share a moment!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
            ))}
        </div>
    );
};

export default StoryList;
