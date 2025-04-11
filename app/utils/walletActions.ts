import { connectWallet, getWalletAddress, spawnProcess, messageAR } from './arweaveUtils';

// Common tags for AO messages
const commonTags = [
  { name: "Name", value: "CanvasNotesApp" },
  { name: "Version", value: "0.2.1" }
];

// Utility function to retry operations
const retryOperation = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      lastError = error;
      
      // Don't wait on the last attempt
      if (attempt < maxRetries) {
        // Add increasing delay between retries
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
};

export const triggerTeamCreationAction = async (teamName: string): Promise<string | null> => {
  try {
    // First try to get the wallet address to check if already connected
    try {
      await getWalletAddress();
    } catch (error) {
      // If not connected, connect the wallet
      await connectWallet();
    }

    console.log('Creating team:', teamName);
    
    // Spawn a new process for the team with retry logic
    const processId = await retryOperation(
      async () => {
        const id = await spawnProcess(teamName);
        if (!id) throw new Error('Process ID was not returned');
        return id;
      },
      2 // Maximum 2 retries
    );
    
    console.log('Team process spawned:', processId);

    // Wait a moment for process to be available
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send a message to the process using the CreateTeam handler
    const messageId = await retryOperation(
      async () => {
        const msgId = await messageAR({
          process: processId,
          data: { action: 'CreateTeam', name: teamName },
          tags: [...commonTags, { name: "Action", value: "CreateTeam" }]
        });
        if (!msgId) throw new Error('Message ID was not returned');
        return msgId;
      },
      2 // Maximum 2 retries
    );
    
    console.log('Team creation message sent:', messageId);
    return processId;
  } catch (error: any) {
    console.error('Team creation chain action failed:', error);
    
    // Return null to indicate failure but don't throw
    return null;
  }
};

export const triggerFileCreationAction = async (fileName: string, teamName: string): Promise<string | null> => {
  try {
    // First try to get the wallet address to check if already connected
    try {
      await getWalletAddress();
    } catch (error) {
      // If not connected, connect the wallet
      await connectWallet();
    }

    console.log('Creating file:', fileName, 'for team:', teamName);
    
    // Spawn a new process for the file
    const processId = await retryOperation(
      async () => {
        const id = await spawnProcess(fileName);
        if (!id) throw new Error('Process ID was not returned');
        return id;
      },
      2 // Maximum 2 retries
    );
    
    console.log('File process spawned:', processId);

    // Wait a moment for process to be available
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send a message to the process using the CreateFile handler
    const messageId = await retryOperation(
      async () => {
        const msgId = await messageAR({
          process: processId,
          data: { 
            action: 'CreateFile', 
            name: fileName,
            team_id: teamName // Using teamName as team_id for simplicity
          },
          tags: [...commonTags, { name: "Action", value: "CreateFile" }]
        });
        if (!msgId) throw new Error('Message ID was not returned');
        return msgId;
      },
      2 // Maximum 2 retries
    );
    
    console.log('File creation message sent:', messageId);
    return processId;
  } catch (error: any) {
    console.error('File creation chain action failed:', error);
    
    // Return null to indicate failure but don't throw
    return null;
  }
}; 