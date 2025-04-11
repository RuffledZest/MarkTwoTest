'use client';

// @ts-ignore - Suppressing type checking for aoconnect imports
import { message, dryrun, createDataItemSigner } from '@permaweb/aoconnect';
import Arweave from 'arweave';

const isClient = typeof window !== 'undefined';

const AOModule = "Do_Uc2Sju_ffp6Ev0AnLVdPtot15rvMjP-a9VVaA5fM"; // aos 2.0.1
const AOScheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
const CommonTags = [
  { name: "Name", value: "Anon" },
  { name: "Version", value: "0.2.1" },
];

const arweave = Arweave.init({
  host: 'localhost',
  port: 1984,
  protocol: 'http',
});

export const PROCESS_ID = import.meta.env.NEXT_PUBLIC_PROCESS_ID;

export const safeDryrun = async (action: string, data = ""): Promise<any> => {
  if (!PROCESS_ID) {
    throw new Error("PROCESS_ID is missing in .env");
  }

  try {
    const result = await dryrun({
      process: PROCESS_ID,
      tags: [{ name: "Action", value: action }],
      data,
      baseUrl: "/api",
    });

    if (!result?.Messages?.[0]?.Data) {
      return null;
    }

    return JSON.parse(result.Messages[0].Data);
  } catch (err) {
    console.error(`Dryrun [${action}] error:`, err);
    throw err;
  }
};

export const sendMessage = async (action: string, data: any): Promise<string> => {
  if (!PROCESS_ID) {
    throw new Error("PROCESS_ID is missing in .env");
  }

  try {
    const messageId = await message({
      process: PROCESS_ID,
      tags: [{ name: "Action", value: action }],
      data: JSON.stringify(data),
      signer: createDataItemSigner(window.arweaveWallet),
      baseUrl: "/api",
    });

    return messageId;
  } catch (err) {
    console.error(`Message [${action}] error:`, err);
    throw err;
  }
};

export const checkWalletBalance = async (): Promise<boolean> => {
  try {
    const addr = await window.arweaveWallet?.getActiveAddress();
    if (!addr) {
      throw new Error("Please connect your wallet first");
    }
    const balance = await arweave.wallets.getBalance(addr);
    const ar = arweave.ar.winstonToAr(balance);
    if (parseFloat(ar) < 0.01) {
      throw new Error("Your wallet balance is too low. Please add some testnet AR tokens.");
    }
    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const connectWallet = async (): Promise<void> => {
  if (!window.arweaveWallet) {
    throw new Error("Arweave Wallet not detected");
  }

  try {
    // @ts-ignore - Suppressing type checking for wallet.connect
    await window.arweaveWallet.connect(
      ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
      {
        name: "AOmarkOne",
        logo: "https://arweave.net/oJrfJh9P79i1JdMJx3IbXUetNL-RRXJomwADSi3xALI"
      },
      {
        host: "localhost",
        port: 1984,
        protocol: "http"
      }
    );
  } catch (err) {
    console.error("Wallet connection error:", err);
    throw err;
  }
};

export const getWalletAddress = async (): Promise<string> => {
  if (!window.arweaveWallet) {
    throw new Error("Arweave Wallet not detected");
  }

  try {
    const address = await window.arweaveWallet.getActiveAddress();
    if (!address) {
      throw new Error("No active wallet address found");
    }
    return address;
  } catch (err) {
    console.error("Error getting wallet address:", err);
    throw err;
  }
};

export async function disconnectWallet() {
  if (!isClient || !window.arweaveWallet) return;
  try {
    await window.arweaveWallet.disconnect();
  } catch (error) {
    console.error(error);
  }
}

export const spawnProcess = async (name: string, tags: any[] = []): Promise<string> => {
  if (typeof window === 'undefined') return '';
  
  try {
    // Ensure wallet is connected first
    await connectWallet();
    
    const arweave = new window.Arweave({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
      timeout: 20000,
    });

    const walletAddress = await getWalletAddress();
    if (!walletAddress) {
      throw new Error('No wallet address found');
    }

    // Create process spawn message with proper AO format
    const processData = {
      Input: {
        'Function': 'Spawn',
        'Module': AOModule,
        'Name': name,
        'Scheduler': AOScheduler
      }
    };

    // Create transaction with all required fields
    const transaction = await arweave.createTransaction({
      data: JSON.stringify(processData),
      last_tx: '', // Required for proper transaction creation
      owner: walletAddress,
      target: '', // No target for process creation
      quantity: '0', // No AR transfer
      reward: '0' // Will be calculated by Arweave
    });

    // Add mandatory AO tags
    transaction.addTag('App-Name', 'CanvasNotesApp');
    transaction.addTag('Content-Type', 'application/json');
    transaction.addTag('Protocol', 'AO');
    transaction.addTag('Type', 'Process');
    transaction.addTag('Action', 'Spawn');
    transaction.addTag('Module', AOModule);
    transaction.addTag('Scheduler', AOScheduler);
    transaction.addTag('Name', name);
    transaction.addTag('Version', '0.2.1');

    // Add custom tags
    for (const tag of tags) {
      transaction.addTag(tag.name, tag.value);
    }

    try {
      // Sign the transaction first
      const signedTransaction = await window.arweaveWallet.sign(transaction);
      
      // Verify signature exists
      if (!signedTransaction || !signedTransaction.signature) {
        throw new Error('Transaction was not signed properly');
      }

      // Post the signed transaction using simple post for process creation
      const response = await arweave.transactions.post(signedTransaction);
      
      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Failed to post transaction: ${response.status}`);
      }

      console.log('Process spawn transaction completed:', signedTransaction.id);
      return signedTransaction.id;

    } catch (error) {
      console.error('Transaction signing/posting error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error spawning process:', error);
    throw error;
  }
};

export async function messageAR({ tags = [], data, anchor = '', process }: {
  tags?: any[],
  data: any,
  anchor?: string,
  process: string
}) {
  if (!isClient) return;

  try {
    // @ts-ignore - Suppressing type checking for dynamic import
    const aoModule = await import('@permaweb/aoconnect');
    // @ts-ignore - Suppressing type checking for destructuring
    const { message, createDataItemSigner } = aoModule;

    if (!process) throw new Error("Process ID is required.");
    if (!data) throw new Error("Data is required.");

    // Format message data for AO
    const messageData = JSON.stringify({
      Input: {
        Action: tags.find(t => t.name === 'Action')?.value || 'Message',
        ...data,
        Module: AOModule,
        Scheduler: AOScheduler
      }
    });

    const allTags = [
      { name: "Protocol", value: "AO" },
      { name: "Module", value: AOModule },
      { name: "Scheduler", value: AOScheduler },
      { name: "Target", value: process },
      { name: "Version", value: "0.2.1" },
      ...tags
    ];
    
    const signer = createDataItemSigner(window.arweaveWallet);

    const messageId = await message({
      data: messageData,
      anchor,
      process,
      tags: allTags,
      signer
    });

    console.log('Message sent successfully:', messageId);
    return messageId;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}
