import { safeDryrun, sendMessage } from './arweaveUtils';

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

export const fetchUserTeams = async (): Promise<Team[]> => {
  try {
    const teams = await safeDryrun("GetUserTeams");
    return teams || [];
  } catch (err) {
    console.error("Error fetching user teams:", err);
    return [];
  }
};

export const fetchTeamFiles = async (teamId: string): Promise<File[]> => {
  try {
    const files = await safeDryrun("GetTeamFiles", JSON.stringify({ team_id: teamId }));
    return files || [];
  } catch (err) {
    console.error("Error fetching team files:", err);
    return [];
  }
};

export const fetchPendingInvitations = async (): Promise<Invitation[]> => {
  try {
    const invitations = await safeDryrun("GetPendingInvitations");
    return invitations || [];
  } catch (err) {
    console.error("Error fetching pending invitations:", err);
    return [];
  }
};

export const createTeam = async (name: string): Promise<Team | null> => {
  try {
    await sendMessage("CreateTeam", { name });
    const teams = await fetchUserTeams();
    return teams[0] || null; // Return the most recently created team
  } catch (err) {
    console.error("Error creating team:", err);
    return null;
  }
};

export const inviteMember = async (teamId: string, invitee: string): Promise<boolean> => {
  try {
    await sendMessage("InviteMember", {
      team_id: teamId,
      invitee: invitee,
    });
    return true;
  } catch (err) {
    console.error("Error inviting member:", err);
    return false;
  }
};

export const acceptInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    await sendMessage("AcceptInvitation", {
      invitation_id: invitationId,
    });
    return true;
  } catch (err) {
    console.error("Error accepting invitation:", err);
    return false;
  }
};

export const saveFile = async (
  teamId: string,
  fileId: string | null,
  name: string,
  content: string
): Promise<File | null> => {
  try {
    await sendMessage("SaveFile", {
      team_id: teamId,
      id: fileId,
      name: name,
      content: content,
    });
    const files = await fetchTeamFiles(teamId);
    return files.find(f => f.name === name) || null;
  } catch (err) {
    console.error("Error saving file:", err);
    return null;
  }
}; 