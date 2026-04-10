'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Shield, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConfessionCardProps {
    author: string;
    content: string;
    likeCount: number;
    commentCount: number;
    timestamp: number;
    onLike?: () => void;
    rawUri?: string;
}

export const ConfessionCard: React.FC<ConfessionCardProps> = ({
    author,
    content: initialContent,
    likeCount,
    commentCount,
    timestamp,
    onLike,
    rawUri,
}) => {
    const [fetchedContent, setFetchedContent] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            if (!rawUri || !rawUri.startsWith('http')) {
                setFetchedContent(initialContent);
                return;
            }

            setIsFetching(true);
            try {
                const response = await fetch(rawUri);
                const data = await response.json();
                setFetchedContent(data.text || data.content || initialContent);
            } catch (error) {
                console.error('Failed to fetch Arweave content:', error);
                setFetchedContent(initialContent);
            } finally {
                setIsFetching(false);
            }
        };

        fetchContent();
    }, [rawUri, initialContent]);

    // [FOSS ISSUE] Task 1: Premium Skeletons
    // Implement shimmering skeleton screens for when isFetching is true.
    // Replace the plain text fallback with a high-fidelity animated shimmer.

    const contentToDisplay = fetchedContent || initialContent;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-2xl hover:shadow-cyan-500/10">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 font-bold text-white shadow-lg">
                        {author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white/90">
                           Anonymous {author.slice(0, 4)}...{author.slice(-4)}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(timestamp * 1000))} ago
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-cyan-400 uppercase border border-cyan-400/20">
                    <Shield className="h-3 w-3" />
                    Verified
                </div>
            </div>

            <p className="mb-6 indent-4 text-lg leading-relaxed text-white/80 line-clamp-4">
                "{contentToDisplay}"
            </p>

            {/* [FOSS ISSUE] Task 6: Media Hydration */}
            {/* If the Arweave content contains image/video URLs, render a beautiful preview here. */}

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onLike}
                        className="flex items-center gap-2 text-white/60 transition-colors hover:text-pink-500 group-hover:scale-110 active:scale-95"
                    >
                        <Heart className="h-5 w-5 fill-current" />
                        <span className="text-sm">{likeCount}</span>
                    </button>
                    {/* [FOSS ISSUE] Task 3: Tipping Interface */}
                    {/* Add a "Tip Author" button here that allows users to send SOL to the author pubkey. */}
                </div>
                <button className="text-white/40 hover:text-white/80 transition-colors">
                    <Share2 className="h-5 w-5" />
                </button>
            </div>
            
            {/* Ambient background glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-3xl transition-opacity group-hover:opacity-100" />
        </div>
    );
};
