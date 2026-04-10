'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWhisperProgram } from '../hooks/useWhisper';
import { useIrys } from '../hooks/useIrys';
import { ConfessionCard } from '../components/ConfessionCard';
import { Send, Sparkles, Ghost, TrendingUp, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import WalletMultiButton to prevent hydration errors
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
    const { connected, publicKey } = useWallet();
    const { getConfessions, createConfession, editConfession, likeConfession, fetchUserConfessions } = useWhisperProgram();
    const { uploadContent } = useIrys();

    const [confessions, setConfessions] = useState<any[]>([]);
    const [userConfessions, setUserConfessions] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFeed = useCallback(async () => {
        setIsLoading(true);
        const data = await getConfessions();
        
        // Fetch actual content from Irys URIs if needed, but for now we'll 
        // just mock the content retrieval or assume the URI is the content for demo
        // In a real app, you'd fetch the JSON from Arweave here.
        const augmentedData = await Promise.all(data.map(async (item: any) => {
            try {
                // If it's a URL, we could fetch it, but let's keep it simple for the demo
                // and just show the URI or a snippet.
                return {
                    id: item.publicKey.toString(),
                    author: item.account.author.toString(),
                    content: item.account.contentUri.startsWith('http') ? "Content secure on Arweave" : item.account.contentUri,
                    likeCount: item.account.likeCount.toNumber(),
                    commentCount: item.account.commentCount.toNumber(),
                    timestamp: item.account.timestamp.toNumber(),
                    rawUri: item.account.contentUri
                };
            } catch (e) {
                return null;
            }
        }));

        setConfessions(augmentedData.filter(i => i !== null));
        setIsLoading(false);
    }, [getConfessions]);

    useEffect(() => {
        if (connected) {
            fetchFeed();
            // Fetch all whispers for this specific user
            fetchUserConfessions().then(setUserConfessions);
        } else {
            setUserConfessions([]);
        }
    }, [connected, fetchFeed, fetchUserConfessions]);

    const handlePublish = async () => {
        if (!content.trim() || isPublishing) return;
        setIsPublishing(true);
        try {
            console.log("Uploading to Irys...");
            const uri = await uploadContent(content);
            
            console.log("Publishing to Solana...");
            // Now we always create a new one for multi-confession
            await createConfession(uri);

            setContent('');
            await fetchFeed();
            // Refresh user state
            const updatedUserAccs = await fetchUserConfessions();
            setUserConfessions(updatedUserAccs);
        } catch (error) {
            console.error("Failed to publish:", error);
            alert("Failed to publish confession. Check console for details.");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleLike = async (pda: string) => {
        try {
            // In a real app, convert string back to PublicKey
            // await likeConfession(new PublicKey(pda));
            // await fetchFeed();
        } catch (error) {
            console.error("Like failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-mesh selection:bg-cyan-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Ghost className="text-white h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        WHISPER
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-full border border-cyan-400/20 uppercase tracking-widest">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        Devnet Active
                    </div>
                    {/* [FOSS ISSUE] Task 5: User Profiles */}
                    {/* Link this button or add a new Nav link to a /profile page that filters by current wallet. */}
                    <WalletMultiButtonDynamic />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Hero / State Section */}
                {!connected ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                            <Sparkles className="h-12 w-12 text-cyan-400" />
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
                            What's your <br />
                            <span className="text-cyan-400">Deepest Secret?</span>
                        </h1>
                        <p className="text-xl text-white/40 max-w-lg">
                            Anonymously share your thoughts on the Solana blockchain. 
                            Fully encrypted, permanently stored on Arweave.
                        </p>
                        <div className="pt-4">
                            <WalletMultiButtonDynamic />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Whisper Input */}
                        <section className="glass rounded-3xl p-8 shadow-2xl shadow-black/50 overflow-hidden relative">
                            <div className="relative z-10 flex flex-col gap-6">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="text-cyan-400 h-5 w-5" />
                                    <h2 className="text-lg font-semibold text-white/90">Speak your truth</h2>
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Whisper something to the world..."
                                    className="w-full h-32 bg-transparent text-xl text-white outline-none resize-none placeholder:text-white/20"
                                />
                                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                                    <div className="text-sm text-white/30">
                                        Permanently stored on <span className="text-white/60">Arweave</span>
                                    </div>
                                    <button 
                                        disabled={isPublishing || !content.trim()}
                                        onClick={handlePublish}
                                        className="flex items-center gap-3 bg-cyan-400 hover:bg-cyan-300 disabled:bg-white/10 disabled:text-white/20 text-black px-8 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-cyan-400/20"
                                    >
                                        {isPublishing ? "Whispering..." : "Whisper Now"}
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-cyan-500/10 blur-[100px] rounded-full" />
                        </section>

                        {/* Discovery Feed */}
                        <section className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    Discovery Feed
                                    <span className="text-sm font-normal text-white/40 ml-2">Recent Whispers</span>
                                </h3>
                                {/* [FOSS ISSUE] Task 4: Tag-based Filtering */}
                                {/* Implement a pill-bar (e.g. #regret, #love) that allows users to filter the discovery feed. */}
                                <div className="flex items-center gap-2 text-white/40 hover:text-white transition-colors cursor-pointer">
                                    <Search className="h-5 w-5" />
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 animate-pulse">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="h-64 rounded-3xl bg-white/5" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <AnimatePresence>
                                        {confessions.map((c) => (
                                            <motion.div
                                                key={c.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                            >
                                                <ConfessionCard
                                                    author={c.author}
                                                    content={c.content}
                                                    likeCount={c.likeCount}
                                                    commentCount={c.commentCount}
                                                    timestamp={c.timestamp}
                                                    onLike={() => handleLike(c.id)}
                                                    rawUri={c.rawUri}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {confessions.length === 0 && !isLoading && (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <Ghost className="h-12 w-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/40">No whispers yet. Be the first to speak!</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            <footer className="py-20 text-center text-white/20 text-sm border-t border-white/5 mx-6">
                &copy; 2026 WHISPER PROTOTYPE • BUILT ON SOLANA & ARWEAVE
            </footer>
        </div>
    );
}
