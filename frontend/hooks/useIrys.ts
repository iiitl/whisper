'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WebUploader } from '@irys/web-upload';
import { WebSolana } from '@irys/web-upload-solana';

export const useIrys = () => {
    const { wallet, publicKey, signMessage, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [uploader, setUploader] = useState<any>(null);

    const getUploader = useCallback(async () => {
        if (!wallet || !publicKey) return null;
        if (uploader) return uploader;

        try {
            const irysUploader = await WebUploader(WebSolana)
                .withProvider({ 
                    publicKey, 
                    signMessage, 
                    signTransaction 
                })
                .withRpc(connection.rpcEndpoint)
                .devnet();
            
            setUploader(irysUploader);
            return irysUploader;
        } catch (error) {
            console.error('Failed to initialize Irys:', error);
            return null;
        }
    }, [wallet, publicKey, signMessage, signTransaction, connection, uploader]);

    const uploadContent = useCallback(async (text: string) => {
        const uploader = await getUploader();
        if (!uploader) throw new Error('Irys not initialized');

        try {
            const data = JSON.stringify({
                text,
                timestamp: Date.now(),
                app: 'Whisper'
            });

            // Convert data to File/Blob for Irys
            const blob = new Blob([data], { type: 'application/json' });
            const file = new File([blob], 'confession.json', { type: 'application/json' });

            const receipt = await uploader.uploadFile(file);
            console.log('Uploaded to Arweave via Irys:', receipt.id);
            return `https://gateway.irys.xyz/${receipt.id}`;
        } catch (error) {
            console.error('Irys upload error:', error);
            throw error;
        }
    }, [getUploader]);

    return {
        uploadContent,
        getUploader
    };
};
