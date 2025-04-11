'use client';

import { useState, useEffect } from 'react';
import { createTeam, fetchUserTeams } from '../utils/teamUtils';
import { getWalletAddress } from '../utils/arweaveUtils';
import { getOperationStatus } from '../utils/backgroundHandler';

export default function TeamCreation() {
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [creationProgress, setCreationProgress] = useState(0);

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const address = await getWalletAddress();
        setIsWalletConnected(!!address);
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setIsWalletConnected(false);
      }
    };

    checkWalletConnection();
  }, []);

  // Monitor operation progress
  useEffect(() => {
    if (!operationId) return;

    const checkProgress = setInterval(() => {
      const status = getOperationStatus(operationId);
      if (status) {
        if (status.status === 'completed') {
          setCreationProgress(100);
          clearInterval(checkProgress);
        } else if (status.status === 'failed') {
          setError(`Operation failed: ${status.data?.error || 'Unknown error'}`);
          clearInterval(checkProgress);
        } else {
          // Simulate progress until we get a real progress update
          setCreationProgress(prev => Math.min(prev + 10, 90));
        }
      }
    }, 500);

    return () => clearInterval(checkProgress);
  }, [operationId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    setCreationProgress(10);
    
    // Generate an operation ID for tracking
    const opId = `team_create_${Date.now()}`;
    setOperationId(opId);

    try {
      if (!isWalletConnected) {
        throw new Error('Please connect your Arweave wallet first');
      }

      // Create the team - this now returns a teamId string
      const teamId = await createTeam(teamName);
      
      setCreationProgress(100);
      setSuccess(`Team created successfully! Team ID: ${teamId}`);
      setTeamName('');
      
      // Reset operation ID after successful completion
      setOperationId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
      setCreationProgress(0);
      console.error('Team creation error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Create Team</h2>
      
      {!isWalletConnected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Please connect your Arweave wallet to create a team
        </div>
      )}

      <form onSubmit={handleCreateTeam} className="space-y-4">
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
            Team Name
          </label>
          <input
            type="text"
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter team name"
            required
            disabled={!isWalletConnected || isCreating}
          />
        </div>

        {creationProgress > 0 && creationProgress < 100 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${creationProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Creating team... {creationProgress}%</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating || !teamName || !isWalletConnected}
          className={`w-full px-4 py-2 text-white rounded-md transition ${
            isCreating || !teamName || !isWalletConnected
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isCreating ? 'Creating...' : 'Create Team'}
        </button>

        {error && (
          <div className="mt-3 p-3 text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 text-green-700 bg-green-50 border border-green-200 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}
      </form>
    </div>
  );
} 