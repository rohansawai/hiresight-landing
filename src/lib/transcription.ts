import fs from "fs";
import axios from "axios";

export interface DiarizationWord {
  word: string;
  speaker: number;
  punctuated_word?: string;
  [key: string]: unknown;
}

export async function transcribeWithDeepgram(fileOrUrl: string): Promise<{ transcript: string; diarization: DiarizationWord[] }> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("Missing Deepgram API key");

  // If it's a remote URL, use Deepgram's URL support
  if (fileOrUrl.startsWith('http')) {
    const response = await axios.post(
      "https://api.deepgram.com/v1/listen?diarize=true&punctuate=true",
      { url: fileOrUrl },
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        maxBodyLength: Infinity,
      }
    );
    const transcript = response.data.results.channels[0].alternatives[0].transcript;
    const diarization = response.data.results.channels[0].alternatives[0].words;
    return { transcript, diarization };
  }

  // Otherwise, treat as local file path (legacy)
  if (!fs.existsSync(fileOrUrl)) throw new Error("File not found");
  const audioStream = fs.createReadStream(fileOrUrl);
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