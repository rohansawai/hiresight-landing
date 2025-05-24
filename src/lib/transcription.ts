import fs from "fs";
import axios from "axios";

export async function transcribeWithDeepgram(filePath: string): Promise<{ transcript: string; diarization: any }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("Missing Deepgram API key");
  if (!fs.existsSync(filePath)) throw new Error("File not found");

  const audioStream = fs.createReadStream(filePath);
  const response = await axios.post(
    "https://api.deepgram.com/v1/listen?diarize=true&punctuate=true",
    audioStream,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/*",
      },
      maxBodyLength: Infinity,
    }
  );

  const transcript = response.data.results.channels[0].alternatives[0].transcript;
  const diarization = response.data.results.channels[0].alternatives[0].words;
  return { transcript, diarization };
} 