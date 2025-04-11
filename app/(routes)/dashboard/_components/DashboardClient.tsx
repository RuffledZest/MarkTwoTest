"use client";

import React, { useEffect, useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import DashboardHeader from "./DashboardHeader";
import DashboardTable from "./DashboardTable";
import { FileListContext } from "@/app/_context/FileListContext";
import InviteDialog from "@/app/_components/InviteDialog";
import InvitationsList from "@/app/_components/InvitationsList";
import { getWalletAddress } from "@/app/utils/arweaveUtils";

export default function DashboardClient() {
  const convex = useConvex();
  const router = useRouter();
  const createUser = useMutation(api.user.createUser);
  const { fileList, setFileList } = useContext(FileListContext);
  const [activeTeam, setActiveTeam] = useState<any>();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      if (address) {
        checkUser(address);
        getTeams(address);
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
        name: address,
        email: address,
        image: "",
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
    if (result && result.length > 0) {
      setActiveTeam(result[0]);
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
        <DashboardTable />
      </div>
    </div>
  );
} 