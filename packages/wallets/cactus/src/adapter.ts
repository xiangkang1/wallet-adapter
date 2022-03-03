import {
    BaseMessageSignerWalletAdapter,
    EventEmitter,
    scopePollingDetectionStrategy,
    SendTransactionOptions,
    WalletAccountError,
    WalletConnectionError,
    WalletDisconnectedError,
    WalletDisconnectionError,
    WalletError,
    WalletName,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSignTransactionError,
    WalletWindowClosedError,
} from '@solana/wallet-adapter-base';
import { Connection, PublicKey, SendOptions, Transaction, TransactionSignature } from '@solana/web3.js';

interface CactusWalletEvents {
    connect(...args: unknown[]): unknown;
    disconnect(...args: unknown[]): unknown;
}

interface CactusWallet extends EventEmitter<CactusWalletEvents> {
    isCactus?: boolean;
    publicKey?: { toBytes(): Uint8Array };
    isConnected: boolean;
    sendTransaction(
        transaction: Transaction,
        options?: SendOptions
    ): Promise<{ signature: TransactionSignature }>;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    _handleDisconnect(...args: unknown[]): unknown;
}

interface CactusWindow extends Window {
    cactus?: CactusWallet;
}

declare const window: CactusWindow;

export interface CactusWalletAdapterConfig {}

export const CactusWalletName = 'Cactus' as WalletName;

export class CactusWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = CactusWalletName;
    // todo 修改跳转地址
    url = 'https://www.mycactus.com/zh';
    // todo 钱包base64 图标
    icon =
        'data:image/png;base64,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';

    private _connecting: boolean;
    private _wallet: CactusWallet | null;
    private _publicKey: PublicKey | null;
    // 如果没有window 与 document 不支持该插件
    private _readyState: WalletReadyState =
        typeof window === 'undefined' || typeof document === 'undefined'
            ? WalletReadyState.Unsupported
            : WalletReadyState.NotDetected;

    constructor(config: CactusWalletAdapterConfig = {}) {
        super();
        console.log('Phantom adapter')
        this._connecting = false;
        this._wallet = null;
        this._publicKey = null;
        if (this._readyState !== WalletReadyState.Unsupported) {
            scopePollingDetectionStrategy(() => {
                // 检查到插件 设置插件为状态为 已安装
                if (window.cactus?.isCactus) {
                    this._readyState = WalletReadyState.Installed;
                    // walletProvider 里面会监听这个变化
                    this.emit('readyStateChange', this._readyState);
                    return true;
                }
                return false;
            });
        }
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return !!this._wallet?.isConnected;
    }

    get readyState(): WalletReadyState {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            if (this._readyState !== WalletReadyState.Installed) throw new WalletNotReadyError();

            this._connecting = true;

            const wallet = window!.cactus!;

            if (!wallet.isConnected) {
                try {
                    await wallet.connect()
                } catch (error: any) {
                    throw new WalletConnectionError(error?.message, error);
                }
            }
            
            console.log('wallet.publicKey', wallet.publicKey)
            // 没有账号  抛出链接错误
            if (!wallet.publicKey) throw new WalletAccountError();

            let publicKey: PublicKey;
            try {
                publicKey = new PublicKey(wallet.publicKey.toBytes());
            } catch (error: any) {
                throw new WalletPublicKeyError(error?.message, error);
            }

            // 链接成功后 监听断开链接事件
            wallet.on('disconnect', this._disconnected);

            // 
            this._wallet = wallet;
            this._publicKey = publicKey;

            // 通知 walletProvider 链接成功
            this.emit('connect', publicKey);
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);

            this._wallet = null;
            this._publicKey = null;

            try {
                await wallet.disconnect();
            } catch (error: any) {
                this.emit('error', new WalletDisconnectionError(error?.message, error));
            }
        }

        this.emit('disconnect');
    }

    async sendTransaction(
        transaction: Transaction,
        connection: Connection,
        options?: SendTransactionOptions
    ): Promise<TransactionSignature> {
        try {
            const wallet = this._wallet;
            if(wallet && 'sendTransaction' in wallet && !options?.signers) {
                transaction.feePayer = transaction.feePayer || this.publicKey || undefined;
                transaction.recentBlockhash =
                    transaction.recentBlockhash || (await connection.getRecentBlockhash('finalized')).blockhash;
                
                console.log('sendTransaction transaction', transaction)
                console.log('sendTransaction options')
                const { signature } = await wallet.sendTransaction(transaction, options);
                console.log('cactus return signature', signature)
                return signature
            }
            return Promise.reject()
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signTransaction(transaction)) || transaction;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signAllTransactions(transactions)) || transactions;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const wallet = this._wallet;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                const { signature } = await wallet.signMessage(message);
                return signature;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    private _disconnected = () => {
        const wallet = this._wallet;
        if (wallet) {
            wallet.off('disconnect', this._disconnected);

            this._wallet = null;
            this._publicKey = null;

            this.emit('error', new WalletDisconnectedError());
            this.emit('disconnect');
        }
    };
}
