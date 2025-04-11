"use client";
import React, { useState, useEffect } from 'react';
import { spawnProcess, messageAR, getWalletAddress, connectWallet } from '../utils/arweaveUtils';
import { setupBackgroundHandlers, sendMessage as sendHandlerMessage, getOperationStatus } from '../utils/backgroundHandler';

interface ProcessOperation {
  id: string;
  status: 'pending' | 'complete' | 'failed';
  processId?: string;
  error?: string;
}

export default function ArweaveIntegration() {
  const [processId, setProcessId] = useState<string>('');
  const [messageResponse, setMessageResponse] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [operation, setOperation] = useState<ProcessOperation | null>(null);
  const [isMessageSending, setIsMessageSending] = useState<boolean>(false);

  useEffect(() => {
    // Setup background handlers
    setupBackgroundHandlers();
    
    // Check wallet connection on mount
    const checkConnection = async () => {
      try {
        const address = await getWalletAddress();
        if (address) {
          setIsConnected(true);
          setWalletAddress(address);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  // Monitor operations
  useEffect(() => {
    if (!operation) return;

    const interval = setInterval(() => {
      const status = getOperationStatus(operation.id);
      
      if (status) {
        if (status.status === 'completed') {
          setOperation({
            ...operation,
            status: 'complete',
            processId: status.data?.processId || operation.processId
          });
          
          // If we have a processId from the operation result, update our state
          if (status.data?.processId) {
            setProcessId(status.data.processId);
          }
          
          clearInterval(interval);
        } else if (status.status === 'failed') {
          setOperation({
            ...operation,
            status: 'failed',
            error: status.data?.error || 'Unknown error'
          });
          clearInterval(interval);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [operation]);

  const handleConnectWallet = async () => {
    try {
      setIsLoading(true);
      await connectWallet();
      const address = await getWalletAddress();
      setIsConnected(true);
      setWalletAddress(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setMessageResponse('Failed to connect wallet. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpawnProcess = async (): Promise<void> => {
    // Create an operation ID for tracking
    const opId = `process_spawn_${Date.now()}`;
    
    setIsLoading(true);
    setMessageResponse('');
    setOperation({
      id: opId,
      status: 'pending'
    });

    try {
      // Notify background handler that we're starting a process spawn
      await sendHandlerMessage('process_spawn_ready', {
        operationId: opId,
        timestamp: Date.now(),
        processName: 'CanvasNotesApp'
      });

      const newProcessId = await spawnProcess('CanvasNotesApp');
      
      if (newProcessId) {
        setProcessId(newProcessId);
        
        // Notify background handler that process spawn is complete
        await sendHandlerMessage('process_spawn_complete', {
          operationId: opId,
          timestamp: Date.now(),
          processId: newProcessId,
          success: true
        });
        
        setOperation({
          id: opId,
          status: 'complete',
          processId: newProcessId
        });
      } else {
        throw new Error("Failed to spawn process");
      }
    } catch (error: any) {
      console.error("Error spawning process:", error);
      setMessageResponse("Error spawning process: " + (error.message || 'Unknown error'));
      
      // Notify background handler of failure
      await sendHandlerMessage('process_spawn_complete', {
        operationId: opId,
        timestamp: Date.now(),
        error: error.message || 'Unknown error',
        success: false
      });
      
      setOperation({
        id: opId,
        status: 'failed',
        error: error.message || 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!processId) {
      setMessageResponse("Please spawn a process first.");
      return;
    }

    const messageOpId = `ao_message_${Date.now()}`;
    setIsMessageSending(true);
    
    try {
      // Notify background handler that we're sending a message
      await sendHandlerMessage('ao_message_ready', {
        operationId: messageOpId,
        timestamp: Date.now(),
        processId,
        messageType: 'test'
      });
      
      const messageId = await messageAR({
        process: processId,
        data: { action: "test", content: "Hello from CanvasNotes!" },
        tags: [{ name: "Type", value: "test" }]
      });
      
      // Notify background handler that message was sent
      await sendHandlerMessage('ao_message_complete', {
        operationId: messageOpId,
        timestamp: Date.now(),
        processId,
        messageId,
        success: true
      });
      
      setMessageResponse(`Message sent successfully with ID: ${messageId}`);
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessageResponse("Error sending message: " + (error.message || 'Unknown error'));
      
      // Notify background handler of failure
      await sendHandlerMessage('ao_message_complete', {
        operationId: messageOpId,
        timestamp: Date.now(),
        processId,
        error: error.message || 'Unknown error',
        success: false
      });
    } finally {
      setIsMessageSending(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Arweave Integration</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Wallet Status</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {walletAddress && (
            <div className="mt-1">
              <p className="text-sm text-gray-700">Address:</p>
              <code className="block p-2 bg-gray-100 rounded text-xs overflow-auto">{walletAddress}</code>
            </div>
          )}
          
          {!isConnected && (
            <button 
              onClick={handleConnectWallet}
              disabled={isLoading}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300"
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Process Management</h3>
          
          <button
            onClick={handleSpawnProcess}
            disabled={isLoading || !isConnected}
            className={`w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition ${
              isLoading || !isConnected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Spawning Process...' : 'Spawn Process'}
          </button>
          
          {operation && (
            <div className="mt-3 p-3 rounded-md border">
              <p className="text-sm font-medium">Operation Status: 
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  operation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                  operation.status === 'complete' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {operation.status === 'pending' ? 'In Progress' : 
                   operation.status === 'complete' ? 'Complete' : 'Failed'}
                </span>
              </p>
              
              {operation.error && (
                <p className="mt-2 text-sm text-red-600">Error: {operation.error}</p>
              )}
            </div>
          )}
        </div>

        {processId && (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Process Information</h3>
            
            <div className="mb-3">
              <p className="text-sm text-gray-700">Process ID:</p>
              <code className="block p-2 bg-gray-100 rounded text-xs overflow-auto">{processId}</code>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={isMessageSending}
              className={`bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition ${
                isMessageSending ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isMessageSending ? 'Sending...' : 'Send Test Message'}
            </button>
          </div>
        )}

        {messageResponse && (
          <div className={`mt-4 p-4 rounded-lg ${
            messageResponse.includes('Error') 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <h3 className="text-md font-semibold mb-1">
              {messageResponse.includes('Error') ? 'Error' : 'Response'}
            </h3>
            <p className={messageResponse.includes('Error') ? 'text-red-600' : 'text-green-600'}>
              {messageResponse}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}