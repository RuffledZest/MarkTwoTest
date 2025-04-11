import { BridgeMessage } from 'webext-bridge';

// Define response and message types
export interface MessageResponse {
  success: boolean;
  type: string;
  data?: any;
  error?: string;
  timestamp: number;
  messageId: string;
}

export type MessageHandler = (message: BridgeMessage<any>) => Promise<MessageResponse>;

// Create a store to track pending operations
interface PendingOperation {
  id: string;
  type: string;
  startTime: number;
  status: 'pending' | 'completed' | 'failed';
  data?: any;
}

const pendingOperations: PendingOperation[] = [];

// Helper to track operations
const trackOperation = (id: string, type: string, data?: any): void => {
  pendingOperations.push({
    id,
    type,
    startTime: Date.now(),
    status: 'pending',
    data
  });
};

// Helper to update operation status
const updateOperation = (id: string, status: 'completed' | 'failed', data?: any): void => {
  const opIndex = pendingOperations.findIndex(op => op.id === id);
  if (opIndex >= 0) {
    pendingOperations[opIndex].status = status;
    if (data) pendingOperations[opIndex].data = data;
  }
};

// Handler factory with error handling and logging
const createHandler = (type: string, handler: (message: BridgeMessage<any>) => Promise<any>): MessageHandler => {
  return async (message: BridgeMessage<any>): Promise<MessageResponse> => {
    const messageId = message.id || `${type}_${Date.now()}`;
    
    try {
      console.log(`[${type}] Processing message:`, message);
      trackOperation(messageId, type, message.data);
      
      const result = await handler(message);
      
      updateOperation(messageId, 'completed', result);
      console.log(`[${type}] Completed successfully:`, result);
      
      return {
        success: true,
        type,
        data: result,
        timestamp: Date.now(),
        messageId
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error(`[${type}] Error:`, error);
      
      updateOperation(messageId, 'failed', { error: errorMessage });
      
      return {
        success: false,
        type,
        error: errorMessage,
        timestamp: Date.now(),
        messageId
      };
    }
  };
};

// Define message handlers with the factory
const messageHandlers: Record<string, MessageHandler> = {
  // Authentication handlers
  'auth_request_ready': createHandler('auth_request', async (message) => {
    // Process auth request
    return { authenticated: true };
  }),
  
  'auth_tab_reloaded_ready': createHandler('tab_reload', async (message) => {
    return { reloaded: true };
  }),
  
  'auth_tab_closed_ready': createHandler('tab_closed', async (message) => {
    return { closed: true };
  }),
  
  'auth_active_wallet_change_ready': createHandler('wallet_change', async (message) => {
    return { wallet: message.data?.wallet };
  }),
  
  'auth_app_disconnected_ready': createHandler('app_disconnect', async (message) => {
    return { disconnected: true };
  }),
  
  'auth_chunk_ready': createHandler('chunk_ready', async (message) => {
    return { chunkProcessed: true };
  }),
  
  // Team handlers
  'team_create_ready': createHandler('team_create', async (message) => {
    return { team: message.data };
  }),
  
  'team_create_complete': createHandler('team_create_complete', async (message) => {
    return { teamCreated: true, teamId: message.data?.teamId };
  }),
  
  // File handlers
  'file_save_ready': createHandler('file_save', async (message) => {
    return { file: message.data };
  }),
  
  'file_save_complete': createHandler('file_save_complete', async (message) => {
    return { fileSaved: true, fileId: message.data?.fileId };
  }),
  
  // Invitation handlers
  'invitation_sent_ready': createHandler('invitation_sent', async (message) => {
    return { invitation: message.data };
  }),
  
  'invitation_sent_complete': createHandler('invitation_sent_complete', async (message) => {
    return { invitationSent: true, invitationId: message.data?.invitationId };
  }),
  
  'invitation_accepted_ready': createHandler('invitation_accepted', async (message) => {
    return { acceptRequest: message.data };
  }),
  
  'invitation_accepted_complete': createHandler('invitation_accepted_complete', async (message) => {
    return { invitationAccepted: true, invitationId: message.data?.invitationId };
  }),
  
  // Process handlers
  'process_spawn_ready': createHandler('process_spawn', async (message) => {
    return { processRequest: message.data };
  }),
  
  'process_spawn_complete': createHandler('process_spawn_complete', async (message) => {
    return { processSpawned: true, processId: message.data?.processId };  
  }),
  
  // Message handlers
  'ao_message_ready': createHandler('ao_message', async (message) => {
    return { messageRequest: message.data };
  }),
  
  'ao_message_complete': createHandler('ao_message_complete', async (message) => {
    return { messageSent: true, messageId: message.data?.messageId };
  })
};

// Get operation status
export const getOperationStatus = (id: string): PendingOperation | undefined => {
  return pendingOperations.find(op => op.id === id);
};

// Get all pending operations
export const getPendingOperations = (): PendingOperation[] => {
  return pendingOperations.filter(op => op.status === 'pending');
};

// Setup handlers
export const setupBackgroundHandlers = () => {
  // Register message handlers
  Object.entries(messageHandlers).forEach(([messageId, handler]) => {
    window.addEventListener('message', async (event) => {
      if (event.data?.id === messageId) {
        try {
          const response = await handler(event.data);
          
          // Post response back to source
          event.source?.postMessage(
            { 
              id: messageId, 
              response,
              type: response.type,
              success: response.success,
              data: response.data,
              error: response.error,
              timestamp: response.timestamp,
            }, 
            { targetOrigin: '*' }
          );
        } catch (error: any) {
          console.error(`Error in message handler for ${messageId}:`, error);
          
          // Send error response
          event.source?.postMessage(
            { 
              id: messageId, 
              error: error?.message || 'Unknown error in message handler',
              type: 'error',
              success: false,
              timestamp: Date.now()
            }, 
            { targetOrigin: '*' }
          );
        }
      }
    });
  });
};

// Function to send a message and wait for response
export const sendMessage = <T extends any>(messageId: string, data: any): Promise<T> => {
  return new Promise((resolve, reject) => {
    const responseHandler = (event: MessageEvent) => {
      if (event.data?.id === messageId && event.data?.response) {
        window.removeEventListener('message', responseHandler);
        
        if (event.data.success) {
          resolve(event.data.response.data);
        } else {
          reject(new Error(event.data.error || 'Unknown error'));
        }
      }
    };
    
    window.addEventListener('message', responseHandler);
    
    window.postMessage({ id: messageId, data }, '*');
    
    // Add timeout to prevent hanging promises
    setTimeout(() => {
      window.removeEventListener('message', responseHandler);
      reject(new Error(`Message timeout: ${messageId}`));
    }, 30000); // 30 second timeout
  });
}; 