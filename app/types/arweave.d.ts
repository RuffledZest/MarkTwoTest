declare module '@permaweb/aoconnect' {
  export type PermissionType = string;
  export interface AppInfo {
    name: string;
    logo: string;
  }
  export interface GatewayConfig {
    host: string;
    port: number;
    protocol: string;
  }
  export interface Transaction {
    id: string;
    owner: string;
    target: string;
    data: string;
    quantity: string;
    reward: string;
    last_tx: string;
    tags: Array<{ name: string; value: string }>;
  }
}

declare global {
  interface Window {
    arweaveWallet: {
      walletName: string;
      connect: (permissions: PermissionType[], appInfo?: AppInfo, gateway?: GatewayConfig) => Promise<void>;
      disconnect: () => Promise<void>;
      getActiveAddress: () => Promise<string>;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
      sign: (transaction: Transaction) => Promise<Transaction>;
      dispatch: (transaction: Transaction) => Promise<Transaction>;
    };
    Arweave: any;
  }
} 