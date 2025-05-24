import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';
import { transcribeWithDeepgram } from '../../../../lib/transcription';
import path from 'path';
import OpenAI from 'openai';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Get user from DB
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const interview = await prisma.interviewSession.findUnique({ where: { id } });
  if (!interview || interview.userId !== user.id) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  // Step 1: Transcription
  let updatedSession = await prisma.interviewSession.findUnique({ where: { id } });
  if (!updatedSession?.transcript) {
    const filePath = path.join(process.cwd(), 'public', interview.fileUrl);
    try {
      const { transcript, diarization } = await transcribeWithDeepgram(filePath);
      await prisma.interviewSession.update({
        where: { id },
        data: { transcript, diarization, status: 'transcribed' },
      });
      updatedSession = await prisma.interviewSession.findUnique({ where: { id } });
    } catch (err) {
      return NextResponse.json({ error: 'Transcription failed', details: String(err) }, { status: 500 });
    }
  }

  // Step 2: Assign Roles (LLM)
  if (!updatedSession?.roles && updatedSession?.transcript && updatedSession?.diarization) {
    try {
      const diarization = Array.isArray(updatedSession.diarization) ? updatedSession.diarization : [];
      const turns = [];
      let lastSpeaker = null;
      let currentTurn: string[] = [];
      for (const word of diarization) {
        if (word.speaker !== lastSpeaker) {
          if (currentTurn.length) turns.push({ speaker: lastSpeaker, text: currentTurn.join(' ') });
          lastSpeaker = word.speaker;
          currentTurn = [word.punctuated_word || word.word];
        } else {
          currentTurn.push(word.punctuated_word || word.word);
        }
        if (turns.length >= 10) break;
      }
      if (currentTurn.length) turns.push({ speaker: lastSpeaker, text: currentTurn.join(' ') });
      const prompt = `You are given a transcript of an interview with speaker labels (e.g., Speaker 0, Speaker 1).\nBased on their language and behavior, identify which speaker is the interviewer and which is the candidate.\nReturn your answer as a JSON object mapping speaker numbers to roles.\n\nTranscript (first few turns):\n${turns.map(t => `Speaker ${t.speaker}: ${t.text}`).join('\n')}\n\nOutput format:\n{\n  "Speaker 0": "Interviewer",\n  "Speaker 1": "Candidate"\n}`;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0,
      });
      const content = response.choices[0]?.message?.content || '';
      let roles = null;
      try {
        roles = JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) roles = JSON.parse(match[0]);
      }
      if (roles) {
        await prisma.interviewSession.update({
          where: { id },
          data: { roles, status: 'roles_assigned' },
        });
        updatedSession = await prisma.interviewSession.findUnique({ where: { id } });
      }
    } catch (err) {
      console.error('Role assignment failed:', err);
    }
  }

  // Step 3: Generate Report and Verdict (LLM)
  if ((!updatedSession?.report || !updatedSession?.verdict) && updatedSession?.transcript && updatedSession?.roles) {
    try {
      const prompt = `You are an AI assistant. Given the following interview transcript and speaker roles, generate a concise, professional report summarizing the candidate's performance, communication, and any notable strengths or weaknesses. Then, provide a clear, one-line verdict at the end (e.g., 'Recommended for next round' or 'Not recommended').\n\nRoles: ${JSON.stringify(updatedSession.roles, null, 2)}\n\nTranscript:\n${updatedSession.transcript}\n\nFormat:\nReport: <your report here>\nVerdict: <your verdict here>`;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.2,
      });
      const output = response.choices[0]?.message?.content || '';
      // Extract report and verdict
      let report = output;
      let verdict = '';
      const verdictMatch = output.match(/Verdict:\s*(.*)/i);
      if (verdictMatch) {
        verdict = verdictMatch[1].trim();
        report = output.replace(/Verdict:\s*[^]*/i, '').replace(/Report:\s*/i, '').trim();      
      }
      await prisma.interviewSession.update({
        where: { id },
        data: { report, verdict, status: 'report_generated' },
      });
      updatedSession = await prisma.interviewSession.findUnique({ where: { id } });
    } catch (err) {
      console.error('Report/verdict generation failed:', err);
    }
  }

  // Step 4: Analyze (LLM)
  // TODO: Call LLM for Q&A extraction, sentiment, etc. and update DB

  // Step 5: Verdict (LLM)
  // TODO: Call LLM to generate verdict/decision and update DB

  // Return updated session
  return NextResponse.json({ success: true, session: updatedSession });
} 