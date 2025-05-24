import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
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

  // Use the public fileUrl directly
  if (!session.fileUrl) {
    return res.status(400).json({ error: "No fileUrl found for this session." });
  }
  const fileUrl = session.fileUrl;
  console.log("FILE URL:", fileUrl);
  try {
    const { transcript, diarization } = await transcribeWithDeepgram(fileUrl);
    await prisma.interviewSession.update({
      where: { id },
      data: {
        transcript,
        diarization: JSON.stringify(diarization),
        status: "transcribed",
      },
    });
    return res.status(200).json({ success: true, transcript, diarization });
  } catch (error) {
    console.log("ERROR:", error);
    const err = error as Error;
    console.error("Transcribe error:", err);
    return res.status(500).json({ error: err.message || "Transcribe failed." });
  }
} 