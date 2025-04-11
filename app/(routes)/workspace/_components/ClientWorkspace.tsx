"use client";

import React, { useEffect, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import WorkSpaceHeader from "./WorkSpaceHeader";
import dynamic from "next/dynamic";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FILE } from "../../dashboard/_components/DashboardTable";

const Editor = dynamic(() => import("./Editor"), { ssr: false });
const Canvas = dynamic(() => import("./Canvas"), { ssr: false });

const ClientWorkspace = ({ params }: { params: { fileId: Id<"files"> } }) => {
  const convex = useConvex();
  const [fileData, setfileData] = useState<FILE>();
  const [activeTab, setActiveTab] = useState("Both");
  const [triggerSave, setTriggerSave] = useState(false);

  useEffect(() => {
    params.fileId && getFileData();
  }, []);

  const getFileData = async () => {
    const file = await convex.query(api.files.getFilebyId, {
      _id: params.fileId,
    });
    setfileData(file);
  };

  const Tabs = [
    { name: "Document" },
    { name: "Both" },
    { name: "Canvas" },
  ];

  return (
    <div className="overflow-hidden w-full">
      <WorkSpaceHeader
        Tabs={Tabs}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        onSave={() => setTriggerSave(!triggerSave)}
        file={fileData}
      />
      {activeTab === "Document" ? (
        <div style={{ height: "calc(100vh - 3rem)" }}>
          <Editor
            onSaveTrigger={triggerSave}
            fileId={params.fileId}
            fileData={fileData!}
          />
        </div>
      ) : activeTab === "Both" ? (
        <ResizablePanelGroup style={{ height: "calc(100vh - 3rem)" }} direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={40} collapsible={false}>
            <Editor
              onSaveTrigger={triggerSave}
              fileId={params.fileId}
              fileData={fileData!}
            />
          </ResizablePanel>
          <ResizableHandle className="bg-neutral-600" />
          <ResizablePanel defaultSize={50} minSize={45}>
            <Canvas
              onSaveTrigger={triggerSave}
              fileId={params.fileId}
              fileData={fileData!}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div style={{ height: "calc(100vh - 3rem)" }}>
          <Canvas
            onSaveTrigger={triggerSave}
            fileId={params.fileId}
            fileData={fileData!}
          />
        </div>
      )}
    </div>
  );
};

export default ClientWorkspace;
