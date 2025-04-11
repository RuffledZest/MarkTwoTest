// No "use client" here — this file stays as a server component

import ClientWorkspace from "../_components/ClientWorkspace";
import { Id } from "@/convex/_generated/dataModel";

export async function generateStaticParams() {
  return [{ fileId: "default" }];
}

export default function WorkspacePage({ params }: { params: { fileId: string } }) {
  return <ClientWorkspace params={{ fileId: params.fileId as Id<"files"> }} />;
}
