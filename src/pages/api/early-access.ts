import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success?: boolean; message?: string; error?: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  console.log("EMAIL:", email);

  if (
    !email ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    await prisma.earlyAccessEmail.create({
      data: { email },
    });
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    // 👇 Type-safely check if it's a Prisma error
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(200)
        .json({ success: true, message: "Already registered" });
    }

    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Failed to save email" });
  }
}