"use client";

import React, { useEffect, useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import DashboardHeader from "./DashboardHeader";
import DashboardTable from "./DashboardTable";
import { FileListContext } from "@/app/_context/FileListContext";
import InviteDialog from "@/app/_components/InviteDialog";
import InvitationsList from "@/app/_components/InvitationsList";
import { getWalletAddress } from "@/app/utils/arweaveUtils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

export default function DashboardClient() {
  const convex = useConvex();
  const router = useRouter();
  const createUser = useMutation(api.user.createUser);
  const { fileList, setFileList } = useContext(FileListContext);
  const [activeTeam, setActiveTeam] = useState<any>();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Id<"teams"> | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const address = await getWalletAddress();
      if (address) {
        setWalletAddress(address);
        getTeams(address);
      } else {
        router.push("/");
      }
    } catch (error) {
      router.push("/");
    }
  };

  const checkUser = async (address: string) => {
    const result = await convex.query(api.user.getUser, {
      email: address,
    });
    if (!result) {
      createUser({
        walletAddress: address,
        email: address,
        password: "default",
        name: address,
      }).then((resp) => {
        if (resp) {
          router.push("/team/create");
        }
      });
    }
  };

  const getTeams = async (address: string) => {
    const result = await convex.query(api.teams.getTeams, {
      email: address,
    });
    if (result && result.length > 0 && result[0]) {
      setTeams(result);
      setSelectedTeam(result[0]._id);
      setActiveTeam(result[0]);
    }
  };

  const handleCreateTeam = async () => {
    if (!walletAddress) return;
    
    try {
      await convex.mutation(api.teams.createTeam , {
        teamName,
        createdBy: walletAddress,
      });
      getTeams(walletAddress);
      setTeamName("");
      toast.success("Team created successfully");
    } catch (error) {
      console.error('Error in team creation:', error);
      toast.error("Error creating team");
    }
  };

  const handleCreateFile = async () => {
    if (!walletAddress || !selectedTeam) return;
    
    try {
        await convex.mutation(api.files.createNewFile, {
        fileName,
        teamId: selectedTeam,
        createdBy: walletAddress,
        content: fileContent
      });
      setFileName("");
      setFileContent("");
      toast.success("File created successfully");
    } catch (error) {
      console.error('Error in file creation:', error);
      toast.error("Error creating file");
    }
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <div className="text-white">
      <DashboardHeader walletAddress={walletAddress} />
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {activeTeam && <InviteDialog teamId={activeTeam._id} />}
        </div>
        <InvitationsList />
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Create Team</h2>
          <div className="flex gap-4">
            <Input
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <Button onClick={handleCreateTeam} disabled={!teamName}>
              Create Team
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Create File</h2>
          <div className="space-y-4">
            <Select 
              value={selectedTeam ?? undefined} 
              onValueChange={(value) => setSelectedTeam(value as Id<"teams">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="File Name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <textarea
              className="w-full p-2 border rounded"
              placeholder="File Content"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={5}
            />
            <Button onClick={handleCreateFile} disabled={!fileName || !selectedTeam}>
              Create File
            </Button>
          </div>
        </div>
        <DashboardTable />
      </div>
    </div>
  );
} 