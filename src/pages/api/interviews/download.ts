import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../app/api/auth/[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";
import { createClient } from '@supabase/supabase-js';
import type { Session } from "next-auth";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const session = await getServerSession(req, res, authOptions) as Session;
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
    // Generate signed URL for download
    if (interviewSession.fileUrl) {
      try {
        const url = new URL(interviewSession.fileUrl);
        const path = url.pathname.split('/object/public/uploads/')[1];
        if (!path) {
          return res.status(400).json({ error: "Could not extract file path from URL." });
        }
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from('uploads').createSignedUrl(path, 60);
        if (signedUrlError) {
          return res.status(500).json({ error: "Failed to generate signed URL: " + signedUrlError.message });
        }
        return res.status(200).json({ success: true, signedUrl: signedUrlData?.signedUrl });
      } catch (e) {
        return res.status(400).json({ error: "Invalid fileUrl format." });
      }
    }
    return res.status(400).json({ error: "No fileUrl found for this session." });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Download error:", err);
    return res.status(500).json({ error: err.message || "Download failed." });
  }
} 