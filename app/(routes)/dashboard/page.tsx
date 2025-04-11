import DashboardClient from "./_components/DashboardClient";

export async function generateStaticParams() {
  return [];
}

export default function DashboardPage() {
  return <DashboardClient />;
}

