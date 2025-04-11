-- AO Chain Handlers for Team and File Management
Handlers = {}
local json = require('json')

-- Initialize SQLite database for storing team and file data
Handlers.add("InitDB", "InitDB", function(msg)
  local sql = require("sqlite")
  sql.connect(":memory:")
  
  -- Create teams table
  sql.exec([[CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creator TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )]])

  -- Create team_members table
  sql.exec([[CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    role TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (team_id, member_id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )]])

  -- Create files table
  sql.exec([[CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )]])

  -- Create invitations table
  sql.exec([[CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    invitee TEXT NOT NULL,
    inviter TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )]])

  msg.reply({ Data = "Database initialized" })
end)

-- Create a new team
Handlers.add("CreateTeam", "CreateTeam", function(msg)
  local sql = require("sqlite")
  local json = require("json")
  local data = json.decode(msg.Data)

  local team_id = msg.Id
  local timestamp = os.time()

  sql.exec(
    "INSERT INTO teams (id, name, creator, created_at) VALUES (?, ?, ?, ?)",
    team_id, data.name, msg.From, timestamp
  )

  -- Add creator as admin
  sql.exec(
    "INSERT INTO team_members (team_id, member_id, role, joined_at) VALUES (?, ?, ?, ?)",
    team_id, msg.From, "admin", timestamp
  )

  msg.reply({
    Data = json.encode({
      id = team_id,
      name = data.name,
      creator = msg.From,
      created_at = timestamp
    })
  })
end)

-- Invite member to team
Handlers.add("InviteMember", "InviteMember", function(msg)
  local sql = require("sqlite")
  local json = require("json")
  local data = json.decode(msg.Data)

  -- Verify sender is team admin
  local role = sql.exec(
    "SELECT role FROM team_members WHERE team_id = ? AND member_id = ?",
    data.team_id, msg.From
  )[1]

  if not role or role.role ~= "admin" then
    msg.reply({ Data = json.encode({ error = "Unauthorized" }) })
    return
  end

  local invitation_id = msg.Id
  local timestamp = os.time()

  sql.exec(
    "INSERT INTO invitations (id, team_id, invitee, inviter, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    invitation_id, data.team_id, data.invitee, msg.From, "pending", timestamp
  )

  msg.reply({
    Data = json.encode({
      id = invitation_id,
      team_id = data.team_id,
      invitee = data.invitee,
      status = "pending"
    })
  })
end)

-- Accept team invitation
Handlers.add("AcceptInvitation", "AcceptInvitation", function(msg)
  local sql = require("sqlite")
  local json = require("json")
  local data = json.decode(msg.Data)

  local invitation = sql.exec(
    "SELECT * FROM invitations WHERE id = ? AND invitee = ? AND status = 'pending'",
    data.invitation_id, msg.From
  )[1]

  if not invitation then
    msg.reply({ Data = json.encode({ error = "Invalid invitation" }) })
    return
  end

  local timestamp = os.time()

  -- Add member to team
  sql.exec(
    "INSERT INTO team_members (team_id, member_id, role, joined_at) VALUES (?, ?, ?, ?)",
    invitation.team_id, msg.From, "member", timestamp
  )

  -- Update invitation status
  sql.exec(
    "UPDATE invitations SET status = 'accepted' WHERE id = ?",
    data.invitation_id
  )

  msg.reply({ Data = json.encode({ status = "accepted" }) })
end)

-- Create/update file
Handlers.add("SaveFile", "SaveFile", function(msg)
  local sql = require("sqlite")
  local json = require("json")
  local data = json.decode(msg.Data)

  -- Verify sender is team member
  local member = sql.exec(
    "SELECT role FROM team_members WHERE team_id = ? AND member_id = ?",
    data.team_id, msg.From
  )[1]

  if not member then
    msg.reply({ Data = json.encode({ error = "Unauthorized" }) })
    return
  end

  local timestamp = os.time()
  local file_id = data.id or msg.Id

  if data.id then
    -- Update existing file
    sql.exec(
      "UPDATE files SET name = ?, content = ?, updated_at = ? WHERE id = ? AND team_id = ?",
      data.name, data.content, timestamp, file_id, data.team_id
    )
  else
    -- Create new file
    sql.exec(
      "INSERT INTO files (id, team_id, name, content, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      file_id, data.team_id, data.name, data.content, msg.From, timestamp, timestamp
    )
  end

  msg.reply({
    Data = json.encode({
      id = file_id,
      name = data.name,
      updated_at = timestamp
    })
  })
end)

-- Get team files
Handlers.add("GetTeamFiles", "GetTeamFiles", function(msg)
  local sql = require("sqlite")
  local json = require("json")
  local data = json.decode(msg.Data)

  -- Verify sender is team member
  local member = sql.exec(
    "SELECT role FROM team_members WHERE team_id = ? AND member_id = ?",
    data.team_id, msg.From
  )[1]

  if not member then
    msg.reply({ Data = json.encode({ error = "Unauthorized" }) })
    return
  end

  local files = sql.exec(
    "SELECT * FROM files WHERE team_id = ? ORDER BY updated_at DESC",
    data.team_id
  )

  msg.reply({ Data = json.encode(files) })
end)

-- Get user teams
Handlers.add("GetUserTeams", "GetUserTeams", function(msg)
  local sql = require("sqlite")
  local json = require("json")

  local teams = sql.exec([[SELECT t.* 
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.member_id = ?
    ORDER BY t.created_at DESC]], msg.From)

  msg.reply({ Data = json.encode(teams) })
end)

-- Get pending invitations
Handlers.add("GetPendingInvitations", "GetPendingInvitations", function(msg)
  local sql = require("sqlite")
  local json = require("json")

  local invitations = sql.exec(
    "SELECT * FROM invitations WHERE invitee = ? AND status = 'pending'",
    msg.From
  )

  msg.reply({ Data = json.encode(invitations) })
end) 