'use client';

import { useMemo, useCallback } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { useAnchorProvider } from '@/hooks/useAnchorProvider';
import idl from '../idl/whisper.json';
import { Whisper } from '../types/whisper';
import { PublicKey } from '@solana/web3.js';

export interface WhisperProgramHook {
    program: anchor.Program<any> | null;
    getConfessions: () => Promise<any[]>;
    fetchUserConfessions: () => Promise<any[]>;
    initializeUserCounter: () => Promise<string | null>;
    createConfession: (contentUri: string) => Promise<string | null>;
    editConfession: (confessionPda: PublicKey, newContentUri: string) => Promise<string | null>;
    likeConfession: (confessionPda: PublicKey) => Promise<string | null>;
}

export const useWhisperProgram = (): WhisperProgramHook => {
    const provider = useAnchorProvider();

    const program = useMemo(() => {
        if (!provider) return null;
        return new anchor.Program(idl as any, provider) as anchor.Program<any>;
    }, [provider]);

    const getConfessions = useCallback(async () => {
        if (!program) return [];
        try {
            const confessions = await (program as any).account.confessionAccount.all();
            return confessions.sort((a: any, b: any) => 
                b.account.timestamp.toNumber() - a.account.timestamp.toNumber()
            );
        } catch (error) {
            console.error('Error fetching confessions:', error);
            return [];
        }
    }, [program]);

    const fetchUserConfessions = useCallback(async () => {
        if (!program || !provider || !provider.wallet.publicKey) return [];
        
        try {
            const confessions = await (program as any).account.confessionAccount.all([
                {
                    memcmp: {
                        offset: 8, // author pubkey
                        bytes: provider.wallet.publicKey.toBase58(),
                    },
                },
            ]);
            return confessions;
        } catch (error) {
            console.error('Error fetching user confessions:', error);
            return [];
        }
    }, [program, provider]);

    const initializeUserCounter = useCallback(async () => {
        if (!program || !provider || !provider.wallet.publicKey) return;

        const [counterPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('user_counter'), provider.wallet.publicKey.toBuffer()],
            program.programId
        );

        try {
            const tx = await (program as any).methods
                .initializeUserCounter()
                .accounts({
                    userCounter: counterPda,
                    user: provider.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            
            await provider.connection.confirmTransaction(tx, 'confirmed');
            return tx;
        } catch (error: any) {
            // If the transaction was already processed or account exists, we can treat it as success
            const errorMsg = error.toString();
            if (errorMsg.includes('already been processed') || errorMsg.includes('0x0')) {
                console.log("User counter already initialized or processing...");
                return null;
            }
            console.error('Error initializing user counter:', error);
            throw error;
        }
    }, [program, provider]);

    const createConfession = useCallback(async (contentUri: string): Promise<string | null> => {
        if (!program || !provider || !provider.wallet.publicKey) return;

        // 1. Derive PDAs
        const [counterPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('user_counter'), provider.wallet.publicKey.toBuffer()],
            program.programId
        );

        // Fetch current count for confession PDA derivation
        let currentCount = new anchor.BN(0);
        try {
            const counterAcc = await (program as any).account.userCounter.fetch(counterPda);
            currentCount = counterAcc.count;
        } catch (e) {
            // If it doesn't exist, count is 0. init_if_needed will handle it.
            console.log("User counter not found, assuming count 0 for PDA derivation.");
        }

        const [confessionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('confession'), 
                provider.wallet.publicKey.toBuffer(),
                currentCount.toArrayLike(Buffer, 'le', 8)
            ],
            program.programId
        );

        try {
            console.log("Publishing confession with index:", currentCount.toNumber());
            const tx = await (program as any).methods
                .createConfession(contentUri, currentCount)
                .accounts({
                    confession: confessionPda,
                    userCounter: counterPda,
                    author: provider.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            
            await provider.connection.confirmTransaction(tx, 'confirmed');
            console.log("Whisper published successfully:", tx);
            return tx;
        } catch (error: any) {
            const errorMsg = error.toString().toLowerCase();
            if (errorMsg.includes('already been processed') || errorMsg.includes('processed') || errorMsg.includes('already exists')) {
                console.warn("Transaction already landing or processed. Refreshing feed.");
                return "SUCCESS_ALREADY_ON_CHAIN";
            }
            console.error('Error in confession publishing:', error);
            throw error;
        }
    }, [program, provider]);

    const likeConfession = useCallback(async (confessionPda: PublicKey) => {
        if (!program || !provider || !provider.wallet.publicKey) return;

        try {
            const tx = await (program as any).methods
                .likeConfession()
                .accounts({
                    confession: confessionPda,
                    user: provider.wallet.publicKey,
                })
                .rpc();
            
            await provider.connection.confirmTransaction(tx, 'confirmed');
            return tx;
        } catch (error) {
            console.error('Error liking confession:', error);
            throw error;
        }
    }, [program, provider]);

    const editConfession = useCallback(async (confessionPda: PublicKey, newContentUri: string) => {
        if (!program || !provider || !provider.wallet.publicKey) return;

        try {
            const tx = await (program as any).methods
                .editConfession(newContentUri)
                .accounts({
                    confession: confessionPda,
                    author: provider.wallet.publicKey,
                })
                .rpc();
            
            await provider.connection.confirmTransaction(tx, 'confirmed');
            return tx;
        } catch (error) {
            console.error('Error editing confession:', error);
            throw error;
        }
    }, [program, provider]);

    return {
        program,
        getConfessions,
        fetchUserConfessions,
        initializeUserCounter,
        createConfession,
        editConfession,
        likeConfession,
    };
};
