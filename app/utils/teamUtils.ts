import { safeDryrun, sendMessage } from './arweaveUtils';
import { sendMessage as sendHandlerMessage, getOperationStatus } from './backgroundHandler';

export interface Team {
  id: string;
  name: string;
  creator: string;
  created_at: number;
}

export interface File {
  id: string;
  team_id: string;
  name: string;
  content: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface Invitation {
  id: string;
  team_id: string;
  invitee: string;
  inviter: string;
  status: string;
  created_at: number;
}

interface TeamOperationResult<T> {
  data: T | null;
  success: boolean;
  error?: string;
  operationId?: string;
}

// Helper function to handle common try/catch pattern
const executeTeamOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<TeamOperationResult<T>> => {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (err: any) {
    console.error(errorMessage, err);
    return {
      success: false,
      data: null,
      error: err?.message || 'Unknown error'
    };
  }
};

export const fetchUserTeams = async (): Promise<TeamOperationResult<Team[]>> => {
  return executeTeamOperation(
    async () => {
      // Notify background handler
      await sendHandlerMessage('auth_request_ready', { action: 'fetchTeams' });
      
      const teams = await safeDryrun("GetUserTeams");
      
      // Notify background that the operation is complete
      await sendHandlerMessage('auth_request_complete', { 
        action: 'fetchTeams',
        result: teams || []
      });
      
      return teams || [];
    },
    "Error fetching user teams:"
  );
};

export const fetchTeamFiles = async (teamId: string): Promise<TeamOperationResult<File[]>> => {
  return executeTeamOperation(
    async () => {
      // Notify background handler
      await sendHandlerMessage('file_save_ready', { 
        action: 'fetchFiles',
        teamId 
      });
      
      const files = await safeDryrun("GetTeamFiles", JSON.stringify({ team_id: teamId }));
      
      // Notify background that the operation is complete
      await sendHandlerMessage('file_save_complete', {
        action: 'fetchFiles',
        teamId,
        fileCount: files?.length || 0
      });
      
      return files || [];
    },
    "Error fetching team files:"
  );
};

export const fetchPendingInvitations = async (): Promise<TeamOperationResult<Invitation[]>> => {
  return executeTeamOperation(
    async () => {
      // Notify background handler
      await sendHandlerMessage('invitation_accepted_ready', { 
        action: 'fetchInvitations'
      });
      
      const invitations = await safeDryrun("GetPendingInvitations");
      
      // Notify background that the operation is complete
      await sendHandlerMessage('invitation_accepted_complete', {
        action: 'fetchInvitations',
        invitationCount: invitations?.length || 0
      });
      
      return invitations || [];
    },
    "Error fetching pending invitations:"
  );
};

export const createTeam = async (name: string): Promise<string> => {
  // Send the initial state to the background handler
  const createOpId = `team_create_${Date.now()}`;
  
  try {
    // Notify background handler that team creation is starting
    await sendHandlerMessage('team_create_ready', {
      name,
      operationId: createOpId,
      timestamp: Date.now()
    });
    
    // Create the team
    const messageId = await sendMessage("CreateTeam", { name });
    
    // Wait for teams to be updated in the backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch the most recent teams to get the created team
    const teamsResult = await fetchUserTeams();
    
    const teamId = teamsResult.success && teamsResult.data && teamsResult.data.length > 0
      ? teamsResult.data[0].id
      : messageId; // Fallback to message ID if we can't get the team ID
    
    // Notify background handler that team creation is complete
    await sendHandlerMessage('team_create_complete', {
      teamId,
      name,
      operationId: createOpId,
      timestamp: Date.now()
    });
    
    return teamId;
  } catch (err: any) {
    console.error("Error creating team:", err);
    
    // Notify background handler of the failure
    await sendHandlerMessage('team_create_complete', {
      error: err?.message || 'Unknown error',
      operationId: createOpId,
      timestamp: Date.now(),
      success: false
    });
    
    throw err;
  }
};

export const inviteMember = async (teamId: string, invitee: string): Promise<boolean> => {
  const inviteOpId = `invite_${teamId}_${invitee}_${Date.now()}`;
  
  try {
    // Notify background handler
    await sendHandlerMessage('invitation_sent_ready', {
      teamId,
      invitee,
      operationId: inviteOpId,
      timestamp: Date.now()
    });
    
    await sendMessage("InviteMember", {
      team_id: teamId,
      invitee: invitee,
    });
    
    // Notify background handler of success
    await sendHandlerMessage('invitation_sent_complete', {
      teamId,
      invitee,
      operationId: inviteOpId,
      timestamp: Date.now(),
      success: true
    });
    
    return true;
  } catch (err: any) {
    console.error("Error inviting member:", err);
    
    // Notify background handler of failure
    await sendHandlerMessage('invitation_sent_complete', {
      error: err?.message || 'Unknown error',
      teamId,
      invitee,
      operationId: inviteOpId,
      timestamp: Date.now(),
      success: false
    });
    
    return false;
  }
};

export const acceptInvitation = async (invitationId: string): Promise<boolean> => {
  const acceptOpId = `accept_${invitationId}_${Date.now()}`;
  
  try {
    // Notify background handler
    await sendHandlerMessage('invitation_accepted_ready', {
      invitationId,
      operationId: acceptOpId,
      timestamp: Date.now()
    });
    
    await sendMessage("AcceptInvitation", {
      invitation_id: invitationId,
    });
    
    // Notify background handler of success
    await sendHandlerMessage('invitation_accepted_complete', {
      invitationId,
      operationId: acceptOpId,
      timestamp: Date.now(),
      success: true
    });
    
    return true;
  } catch (err: any) {
    console.error("Error accepting invitation:", err);
    
    // Notify background handler of failure
    await sendHandlerMessage('invitation_accepted_complete', {
      error: err?.message || 'Unknown error',
      invitationId,
      operationId: acceptOpId,
      timestamp: Date.now(),
      success: false
    });
    
    return false;
  }
};

export const saveFile = async (
  teamId: string,
  fileId: string | null,
  name: string,
  content: string
): Promise<File | null> => {
  const saveOpId = `save_file_${teamId}_${name}_${Date.now()}`;
  
  try {
    // Notify background handler
    await sendHandlerMessage('file_save_ready', {
      teamId,
      fileId,
      name,
      contentLength: content.length,
      operationId: saveOpId,
      timestamp: Date.now()
    });
    
    await sendMessage("SaveFile", {
      team_id: teamId,
      id: fileId,
      name: name,
      content: content,
    });
    
    // Wait briefly for the file to be saved in the backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch the updated files
    const filesResult = await fetchTeamFiles(teamId);
    const savedFile = filesResult.success && filesResult.data 
      ? filesResult.data.find(f => f.name === name) 
      : null;
    
    // Notify background handler of success
    await sendHandlerMessage('file_save_complete', {
      teamId,
      fileId: savedFile?.id || fileId,
      name,
      operationId: saveOpId,
      timestamp: Date.now(),
      success: true
    });
    
    return savedFile;
  } catch (err: any) {
    console.error("Error saving file:", err);
    
    // Notify background handler of failure
    await sendHandlerMessage('file_save_complete', {
      error: err?.message || 'Unknown error',
      teamId,
      fileId,
      name,
      operationId: saveOpId,
      timestamp: Date.now(),
      success: false
    });
    
    return null;
  }
}; 