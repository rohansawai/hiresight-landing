import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { transcribeWithDeepgram } from "../../../lib/transcription";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing interview session id" });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const filePath = path.join(process.cwd(), "public", session.fileUrl);

  try {
    const { transcript, diarization } = await transcribeWithDeepgram(filePath);
    await prisma.interviewSession.update({
      where: { id },
      data: {
        transcript,
        diarization,
        status: "transcribed",
      },
    });
    return res.status(200).json({ success: true, transcript, diarization });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: error.message || "Transcription failed." });
  }
} 