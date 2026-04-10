'use client';

import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';

export const useAnchorProvider = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new anchor.AnchorProvider(connection, wallet, {
            preflightCommitment: 'confirmed',
        });
    }, [connection, wallet]);

    return provider;
};
