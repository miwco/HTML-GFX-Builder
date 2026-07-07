// The brainstorm chat behind the Describe-it step: a short back-and-forth with Claude to
// sharpen a vague idea into a generation-ready brief. Every assistant reply ends with a
// machine-readable "BRIEF:" line reflecting the whole conversation so far — the UI offers
// it as a one-click fill for the prompt box.

import { callClaude } from './anthropic';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SYSTEM = `You are the design partner inside NoaCG Studio, brainstorming a
broadcast graphic with the user before it gets generated. You know what makes a graphic
generable here: a clear WHAT (the kind of graphic), the operator-editable FIELDS (text,
long text, number, image), and the FEEL (family/mood, colors, motion character, screen
position).

Rules:
- Be concrete and brief (2-5 sentences). Suggest, don't lecture.
- Ask AT MOST one clarifying question per reply — only when the answer genuinely changes
  the design.
- Steer gently toward broadcast craft: one accent color, clear hierarchy, entrances
  0.5-0.9s, exits faster, linear only for continuous motion.
- ALWAYS end your reply with a single line starting exactly "BRIEF: " — a one-paragraph,
  generation-ready brief reflecting everything agreed so far. It must stand alone (the
  generator never sees this chat).`;

/** One brainstorm turn. Returns the reply text (BRIEF line stripped) + the brief. */
export async function brainstorm(history: ChatMessage[]): Promise<{ reply: string; brief: string | null }> {
  const text = (await callClaude({
    system: SYSTEM,
    messages: history.map((m) => ({ role: m.role, content: [{ type: 'text' as const, text: m.text }] })),
    maxTokens: 700,
  })) as string;

  const match = text.match(/^BRIEF:\s*(.+)$/ms);
  const brief = match ? match[1].trim().replace(/\s+/g, ' ') : null;
  const reply = text.replace(/^BRIEF:\s*.+$/ms, '').trim();
  return { reply: reply || text.trim(), brief };
}
