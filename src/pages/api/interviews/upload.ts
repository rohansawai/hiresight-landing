import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../app/api/auth/[...nextauth]/authOptions";
import { IncomingForm, Fields, Files, File } from "formidable";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createClient } from '@supabase/supabase-js';
import type { Session } from "next-auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const session = await getServerSession(req, res, authOptions as any) as Session;
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), "public/uploads"),
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 500, // 500MB
    });

    const data = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err: any, fields: Fields, files: Files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    console.log("Parsed fields:", data.fields);
    console.log("Parsed files:", data.files);

    const fileField = data.files.file as File | File[] | undefined;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Find or create the user in the database
    let user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: session.user.email, name: session.user.name || undefined, image: session.user.image || undefined } });
    }

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(file.filepath);
    const filename = `${Date.now()}-${file.originalFilename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, fileBuffer, {
        contentType: file.mimetype || undefined,
        upsert: true,
      });
    if (uploadError) {
      return res.status(500).json({ error: 'Failed to upload to storage' });
    }
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    const publicUrl = publicUrlData.publicUrl;

    // Save InterviewSession
    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        fileUrl: publicUrl,
        status: "uploaded",
      },
    });

    return res.status(200).json({ success: true, session: interviewSession });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message || "Upload failed." });
  }
} 