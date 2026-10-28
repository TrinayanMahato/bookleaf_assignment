import { GoogleGenAI, ApiError } from '@google/genai';
import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../models/Ticket.js';
import { COMPANY_OVERVIEW, TONE_GUIDELINES, CATEGORY_KNOWLEDGE } from '../config/knowledgeBase.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
// Tried in order when the main model is overloaded (503) or rate limited (429).
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL);
const TIMEOUT_MS = 30_000;
const RETRY_DELAYS_MS = [1_000, 3_000]; // per model, before giving up on it

// Created lazily so the server still boots (and falls back) when no key is configured.
let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: TIMEOUT_MS } });
  return client;
};

// Logs the failure type; callers decide how to degrade.
const logAIError = (err, action) => {
  if (err instanceof ApiError) {
    if (err.status === 429) console.warn(`AI rate limited while ${action}`);
    else console.error(`AI API error ${err.status} while ${action}: ${err.message.slice(0, 200)}`);
  } else {
    console.error(`AI ${action} failed:`, err.message);
  }
};

const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const isRetryable = (err) => !(err instanceof ApiError) || RETRYABLE_STATUSES.has(err.status); // network errors and timeouts too
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini often answers 503 "high demand" for a few seconds at a time, so one failed call
// shouldn't fail the feature: retry the same model with backoff, then try each fallback model.
// Errors that retrying can't fix (bad key, bad request) are thrown straight away.
const generateContent = async (ai, request, action) => {
  let lastErr;
  for (const model of [MODEL, ...FALLBACK_MODELS]) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const response = await ai.models.generateContent({ ...request, model });
        if (model !== MODEL || attempt > 0) console.info(`AI ${action} succeeded with ${model} (attempt ${attempt + 1})`);
        return response;
      } catch (err) {
        lastErr = err;
        logAIError(err, `${action} with ${model}`);
        if (err instanceof ApiError && err.status === 404) break; // model retired: go to the next one
        if (!isRetryable(err)) throw err;
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastErr;
};

const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  reason: z.string(),
});

// Only the rules needed to classify — the full Knowledge Base is saved for the draft-reply call.
const CLASSIFY_SYSTEM_PROMPT = `You triage author support tickets for BookLeaf Publishing, a self-publishing company in India and the US.

Pick exactly one category:
- Royalty & Payments: royalty amounts, payouts, bank transfers, royalty breakdowns
- ISBN & Metadata Issues: wrong/duplicate ISBN, wrong book linked, title/description/author details on listings
- Printing & Quality: misprints, binding defects, blurry images, color issues, author copies
- Distribution & Availability: book unavailable or missing on Amazon/Flipkart/BookLeaf Store, listing delays
- Book Status & Production Updates: progress through editing, cover design, typesetting, proofreading, printing
- General Inquiry: anything else (account, bio, packages, how-to questions)

Pick a priority:
- Critical: money owed and clearly overdue for a long time (e.g. no royalty for 6+ months), ISBN errors (BookLeaf policy treats these as high priority and escalates them), a live book completely unavailable everywhere, or legal/threatening language
- High: a payout missing past the 45-day window after quarter end, quality defects in delivered copies, a live book unavailable on a platform, production stuck well beyond normal timelines
- Medium: questions about amounts or timelines that need checking, minor delays, metadata updates on live books
- Low: general how-to questions, profile/bio changes, information requests with no problem to fix

Royalties are paid quarterly within 45 days of quarter end; payouts under ₹1,000 roll over to the next quarter. Use the book facts provided to judge urgency.
Keep "reason" to one short sentence an ops admin can scan.`;

// Short factual summary of the book, not the whole record, to keep the prompt small.
const describeBook = (book) => {
  if (!book) return 'Book: General / Account Level (no specific book)';
  return [
    `Book: "${book.title}" (${book.bookId})`,
    `Status: ${book.status}`,
    `Royalty pending: ₹${book.royaltyPending}`,
    `Last payout: ${book.lastRoyaltyPayoutDate ? book.lastRoyaltyPayoutDate.toISOString().slice(0, 10) : 'never'}`,
  ].join('\n');
};

// Keyword rules used when the AI is unavailable, so every ticket still gets a sensible category.
const FALLBACK_RULES = [
  { category: 'ISBN & Metadata Issues', priority: 'High', words: ['isbn', 'wrong book', 'metadata'] },
  { category: 'Royalty & Payments', priority: 'High', words: ['never received', 'not received', "haven't received", 'no royalty', 'missing payment'] },
  { category: 'Royalty & Payments', priority: 'Medium', words: ['royalt', 'payout', 'payment', 'bank', '₹'] },
  { category: 'Printing & Quality', priority: 'High', words: ['misprint', 'binding', 'blurry', 'print quality', 'defect', 'misaligned', 'author copies'] },
  { category: 'Distribution & Availability', priority: 'High', words: ['unavailable', 'not available', 'not showing', 'out of stock'] },
  { category: 'Book Status & Production Updates', priority: 'Medium', words: ['typesetting', 'cover design', 'proofread', 'editing', 'in production', 'when will'] },
];

export const fallbackClassification = (subject, description) => {
  const text = `${subject} ${description}`.toLowerCase();
  const rule = FALLBACK_RULES.find((r) => r.words.some((w) => text.includes(w)));
  return {
    category: rule?.category ?? 'General Inquiry',
    priority: rule?.priority ?? 'Low',
    reason: 'Classified by keyword rules (AI unavailable)',
    source: 'fallback',
  };
};

// Returns { category, priority, reason, source }. Never throws: any AI failure falls back to keyword rules.
export const classifyTicket = async ({ subject, description, book }) => {
  const ai = getClient();
  if (!ai) return fallbackClassification(subject, description);

  try {
    const response = await generateContent(ai, {
      contents: `${describeBook(book)}\n\n<ticket>\nSubject: ${subject}\n\n${description}\n</ticket>`,
      config: {
        systemInstruction: CLASSIFY_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(ClassificationSchema),
        maxOutputTokens: 1024,
      },
    }, 'classifying');

    // The schema constrains Gemini's output; Zod re-checks it before it touches the DB.
    const parsed = ClassificationSchema.safeParse(JSON.parse(response.text ?? 'null'));
    if (!parsed.success) {
      console.warn(`AI classification unusable (finishReason: ${response.candidates?.[0]?.finishReason}), using fallback`);
      return fallbackClassification(subject, description);
    }
    return { ...parsed.data, source: 'ai' };
  } catch {
    return fallbackClassification(subject, description);
  }
};

// Thrown by generateDraft so the controller can answer 503 and let the admin write manually.
export class AIUnavailableError extends Error {}

const formatDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'never');

// Everything the draft can cite as fact; only fields that exist for this book.
const describeBookForDraft = (book) => {
  if (!book) return 'The ticket is about the account in general, not a specific book.';
  const lines = [
    `Title: "${book.title}" (${book.bookId})`,
    `ISBN: ${book.isbn ?? 'not assigned yet'}`,
    `Status: ${book.status}`,
  ];
  if (book.status === 'Published & Live') {
    lines.push(
      `Published: ${formatDate(book.publicationDate)}`,
      `MRP: ₹${book.mrp}`,
      `Copies sold: ${book.totalCopiesSold}`,
      `Royalty earned: ₹${book.totalRoyaltyEarned}, paid: ₹${book.royaltyPaid}, pending: ₹${book.royaltyPending}`,
      `Last royalty payout: ${formatDate(book.lastRoyaltyPayoutDate)}`,
      `Print partner: ${book.printPartner}`,
      `Available on: ${book.availableOn.join(', ') || 'none'}`,
    );
  }
  return lines.join('\n');
};

const buildDraftSystemPrompt = (category) => {
  const kb = CATEGORY_KNOWLEDGE[category] ?? CATEGORY_KNOWLEDGE['General Inquiry'];
  return `You are a member of the BookLeaf Publishing author support team, drafting a reply that an admin will review and send.

<company>
${COMPANY_OVERVIEW}
</company>

<policy category="${category}">
${kb.policy}
</policy>

<how_we_handle_similar_queries>
${kb.example}
</how_we_handle_similar_queries>

<tone>
${TONE_GUIDELINES}
</tone>

How to write the reply:
1. Greet the author by first name and acknowledge their specific concern in their own terms.
2. Reassure them clearly that the team is looking into it and it will be resolved.
3. Personalise it with the real facts from <book_facts> (book title, status, royalty amounts, dates) and the policy above.
4. Give a concrete timeline and a clear next step, using the timelines in the policy (or 48 hours for anything needing investigation).

Only state what <book_facts>, <ticket> and the policy tell you. Do not invent internal progress, causes, team activity or dates (e.g. "your layout is in final review", "the team gave it extra attention"). When you don't know why something happened, say the team is checking it and when the author will hear back.
5. Sign off as "Warm regards,\nThe BookLeaf Support Team".

Write plain text only (no markdown), 120-220 words. Output only the reply itself.`;
};

// Returns the draft text. Throws AIUnavailableError on any AI failure.
export const generateDraft = async ({ ticket, book, author }) => {
  const ai = getClient();
  if (!ai) throw new AIUnavailableError('AI is not configured');

  const history = ticket.messages
    .map((m) => `${m.senderModel === 'Admin' ? 'BookLeaf' : 'Author'}: ${m.body}`)
    .join('\n\n');
  const attachmentNote = ticket.attachments.length
    ? `The author attached ${ticket.attachments.length} file(s): ${ticket.attachments.map((a) => a.originalName).join(', ')}.`
    : 'No attachments.';

  const userContent = `<author>Name: ${author.name}</author>

<book_facts>
${describeBookForDraft(book)}
</book_facts>

<ticket>
Category: ${ticket.category} | Priority: ${ticket.priority} | Status: ${ticket.status}
Opened: ${formatDate(ticket.createdAt)}
Subject: ${ticket.subject}

${ticket.description}

${attachmentNote}
</ticket>
${history ? `\n<conversation_so_far>\n${history}\n</conversation_so_far>\n` : ''}
Draft the next reply from BookLeaf to this author.`;

  try {
    const response = await generateContent(ai, {
      contents: userContent,
      config: {
        systemInstruction: buildDraftSystemPrompt(ticket.category),
        maxOutputTokens: 2048,
      },
    }, 'drafting');

    const text = response.text?.trim();
    if (!text) {
      throw new AIUnavailableError(`AI returned no draft (finishReason: ${response.candidates?.[0]?.finishReason})`);
    }
    return text;
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      console.warn(err.message);
      throw err;
    }
    throw new AIUnavailableError('AI draft unavailable');
  }
};
