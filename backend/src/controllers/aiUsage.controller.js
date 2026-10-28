import { z } from 'zod';
import AiCall, { AI_ACTIONS } from '../models/AiCall.js';

const usageQuerySchema = z.object({
  action: z.enum(AI_ACTIONS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// Token and call totals for one group of calls.
const totals = {
  calls: { $sum: 1 },
  failed: { $sum: { $cond: ['$success', 0, 1] } },
  promptTokens: { $sum: '$promptTokens' },
  outputTokens: { $sum: '$outputTokens' },
  thinkingTokens: { $sum: '$thinkingTokens' },
  totalTokens: { $sum: '$totalTokens' },
  avgLatencyMs: { $avg: '$latencyMs' },
};

const round = ({ _id, avgLatencyMs, ...rest }) => ({ ...(_id && { key: _id }), ...rest, avgLatencyMs: Math.round(avgLatencyMs ?? 0) });

// GET /api/admin/ai-usage
export const getAiUsage = async (req, res) => {
  const parsed = usageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }
  const { action, from, to, page, limit } = parsed.data;

  const filter = {};
  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = new Date(to.getTime() + 86_399_999); // include the whole "to" day
  }

  try {
    const [overall, byAction, byModel, calls, total] = await Promise.all([
      AiCall.aggregate([{ $match: filter }, { $group: { _id: null, ...totals } }]),
      AiCall.aggregate([{ $match: filter }, { $group: { _id: '$action', ...totals } }, { $sort: { _id: 1 } }]),
      AiCall.aggregate([{ $match: filter }, { $group: { _id: '$model', ...totals } }, { $sort: { calls: -1 } }]),
      AiCall.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('ticket', 'subject')
        .populate('admin', 'name')
        .lean(),
      AiCall.countDocuments(filter),
    ]);

    return res.status(200).json({
      summary: {
        ...round(overall[0] ?? { calls: 0, failed: 0, promptTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 }),
        byAction: byAction.map(round),
        byModel: byModel.map(round),
      },
      calls,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('Loading AI usage failed:', err);
    return res.status(500).json({ error: 'Could not load AI usage, please try again' });
  }
};
