import React from 'react';
import { useStoryStore } from '../store/storyStore';
import { Trash2, Eye, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const StoryCard = ({ story }) => {
    const { deleteStory } = useStoryStore();
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (confirm('Delete this story?')) {
            setIsDeleting(true);
            await deleteStory(story.id);
            setIsDeleting(false);
        }
    };

    return (
        <div className="group relative aspect-[9/16] rounded-2xl overflow-hidden glass-card transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:shadow-primary/20">
            {/* Media */}
            <img
                src={story.mediaUrl}
                alt={story.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            {/* Content */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                            {formatDistanceToNow(new Date(story.createdAt))} ago
                        </span>
                    </div>

                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-full bg-accent/20 hover:bg-accent backdrop-blur-md border border-accent/30 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>

                <div>
                    <h3 className="text-white font-black text-sm line-clamp-2 mb-1 drop-shadow-lg leading-tight">
                        {story.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium italic">
                        {!story.isSynced && (
                            <span className="flex items-center gap-1 text-accent animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                Pending Sync
                            </span>
                        )}
                        {story.isSynced && (
                            <span className="flex items-center gap-1 text-primary">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Cloud Synced
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover State Decoration */}
            <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 transition-all duration-300 rounded-2xl pointer-events-none" />
        </div>
    );
};

export default StoryCard;
