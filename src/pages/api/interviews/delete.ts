import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../app/api/auth/[...nextauth]/authOptions";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import type { Session } from "next-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const session = await getServerSession(req, res, authOptions as any) as Session;
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing interview session id" });
    }
    // Find the session and check ownership
    const interviewSession = await prisma.interviewSession.findUnique({ where: { id } });
    if (!interviewSession) {
      return res.status(404).json({ error: "Session not found" });
    }
    // Find user
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || interviewSession.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", interviewSession.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // Delete DB record
    await prisma.interviewSession.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("Delete error:", err);
    return res.status(500).json({ error: err.message || "Delete failed." });
  }
} 