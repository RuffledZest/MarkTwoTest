'use client';

// @ts-ignore - Suppressing type checking for aoconnect imports
import { message, dryrun, createDataItemSigner } from '@permaweb/aoconnect';
import Arweave from 'arweave';
import { sign } from 'crypto';
import Cookies from 'js-cookie';

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

// Use a fallback value and make it safe for SSR
export const PROCESS_ID = typeof window !== 'undefined' 
  ? import.meta.env?.NEXT_PUBLIC_PROCESS_ID || process.env.NEXT_PUBLIC_PROCESS_ID || 'zmxiMJlooJ0oGPPs3PYOWhKsaAt4LrY9e4H2XvYQrxI'
  : 'zmxiMJlooJ0oGPPs3PYOWhKsaAt4LrY9e4H2XvYQrxI'; // Fallback value

export const safeDryrun = async (action: string, data = ""): Promise<any> => {
  if (typeof window === 'undefined') {
    // Return empty data when running on the server
    console.warn('safeDryrun called during server-side rendering, returning empty data');
    return null;
  }

  if (!PROCESS_ID) {
    throw new Error("PROCESS_ID is missing in environment variables");
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
  if (typeof window === 'undefined') {
    console.warn('sendMessage called during server-side rendering');
    throw new Error('Arweave operations cannot be performed during server-side rendering');
  }

  if (!PROCESS_ID) {
    throw new Error("PROCESS_ID is missing in environment variables");
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
  if (typeof window === 'undefined') {
    console.warn('connectWallet called during server-side rendering');
    throw new Error('Cannot connect wallet during server-side rendering');
  }

  if (!window.arweaveWallet) {
    throw new Error("Arweave Wallet not detected");
  }

  try {
    // @ts-ignore - Suppressing type checking for wallet.connect
    await window.arweaveWallet.connect(
      ["ACCESS_ADDRESS", "SIGN_TRANSACTION", "DISPATCH"],
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

export const getWalletAddress = async (): Promise<string | null> => {
  if (!isClient) return null;
  
  try {
    const address = await window.arweaveWallet.getActiveAddress();
    if (address) {
      Cookies.set('wallet-connected', 'true', { expires: 7 }); // Cookie expires in 7 days
      window.dispatchEvent(new Event('wallet-connected'));
    }
    return address;
  } catch (error) {
    Cookies.remove('wallet-connected');
    window.dispatchEvent(new Event('wallet-disconnected'));
    throw error;
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
  if (typeof window === 'undefined') {
    console.warn('spawnProcess called during server-side rendering');
    return '';
  }
  
  try {
    // Ensure wallet is connected first
    await connectWallet();
    
    // Use a more explicit Arweave instance creation
    const arweave = new window.Arweave({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
      timeout: 30000, // Increased timeout
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

    console.log('Creating process with data:', processData);
    
    // Get the network info to properly calculate the reward
    const networkInfo = await arweave.network.getInfo().catch((err: Error) => {
      console.error('Failed to get network info:', err);
      return null;
    });
    
    // Create transaction with all required fields
    const transaction = await arweave.createTransaction({
      data: JSON.stringify(processData),
      // Let Arweave calculate the last_tx
      owner: walletAddress,
      target: '', // No target for process creation
      quantity: '0', // No AR transfer
    });
    
    // Calculate proper reward if possible
    if (networkInfo) {
      await arweave.transactions.getPrice(
        Buffer.from(JSON.stringify(processData)).byteLength
      ).then((reward: string) => {
        transaction.reward = reward;
      }).catch((err: Error) => {
        console.warn('Could not calculate reward, using default:', err);
      });
    }

    console.log('Transaction created:', transaction);

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
      console.log('About to sign transaction');
      
      // Try dispatch first, fall back to sign if dispatch permission is missing
      let signedTransaction;
      try {
        signedTransaction = await window.arweaveWallet.dispatch(transaction);
      } catch (dispatchError: any) {
        // Check if this is a permission error for dispatch
        if (dispatchError.message && dispatchError.message.includes('dispatch')) {
          console.log('Dispatch permission missing, falling back to sign');
          signedTransaction = await window.arweaveWallet.sign(transaction);
        } else {
          // Re-throw if it's not a dispatch permission error
          throw dispatchError;
        }
      }
      
      console.log('Transaction signed:', signedTransaction.id);
      
      // Post with proper error handling
      const response = await arweave.transactions.post(signedTransaction);
      
      console.log('Transaction post response:', response);
      
      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Failed to post transaction: ${response.status}`);
      }

      console.log('Process spawn transaction completed:', signedTransaction.id);
      return signedTransaction.id;
    } catch (error) {
      console.error('Transaction signing/posting error:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('insufficient balance')) {
          throw new Error('Insufficient wallet balance to create process. Get some AR tokens first.');
        } else if (error.message.includes('permission')) {
          throw new Error('Wallet permission denied. Please allow the transaction in your wallet.');
        }
      }
      
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
  process: string,
}) {
  if (typeof window === 'undefined') {
    console.warn('messageAR called during server-side rendering');
    return '';
  }

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

    console.log('Sending message to process:', process);
    console.log('Message data:', messageData);

    const allTags = [
      { name: "Protocol", value: "AO" },
      { name: "Module", value: AOModule },
      { name: "Scheduler", value: AOScheduler },
      { name: "Target", value: process },
      { name: "Version", value: "0.2.1" },
      ...tags
    ];
    
    // Make sure wallet is connected before signing
    await connectWallet().catch(err => {
      console.warn('Auto wallet connect attempt failed:', err);
    });
    
    try {
      // Create a signer with error handling
      const signer = createDataItemSigner(window.arweaveWallet);
      
      // Using try-catch around the specific message call for better error handling
      const messageId = await message({
        data: messageData,
        anchor,
        process,
        tags: allTags,
        signer
      });
  
      console.log('Message sent successfully:', messageId);
      return messageId;
    } catch (signError: any) {
      console.error('Error during message signing/sending:', signError);
      
      // More specific error based on common issues
      if (signError.message?.includes('permission')) {
        throw new Error('Wallet permission denied. Please allow the transaction in your wallet.');
      } else if (signError.message?.includes('balance')) {
        throw new Error('Insufficient wallet balance. Please add AR tokens to your wallet.');
      } else if (signError.message?.includes('process')) {
        throw new Error(`Invalid process ID: ${process}. Please verify the process exists.`);
      }
      
      throw signError;
    }
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw error;
  }
}
