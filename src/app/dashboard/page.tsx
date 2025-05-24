import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  console.log("SESSION:", session);

  if (!session) {
    redirect("/api/auth/signin");
  }
  return <DashboardClient />;
} 