import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  try {
    await prisma.earlyAccessEmail.create({
      data: { email },
    });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint failed
      return res.status(200).json({ success: true, message: "Already registered" });
    }
    return res.status(500).json({ error: "Failed to save email" });
  }
} 