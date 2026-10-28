import mongoose from 'mongoose';

export const AI_ACTIONS = ['classify', 'draft'];

// One document per Gemini request attempt (retries and fallbacks included), so token usage and cost can be audited.
const aiCallSchema = new mongoose.Schema(
  {
    action: { type: String, enum: AI_ACTIONS, required: true },
    model: { type: String, required: true },
    attempt: { type: Number, required: true }, // 1 for the first try on this model
    success: { type: Boolean, required: true },
    errorStatus: { type: Number, default: null }, // HTTP status from Gemini, null for timeouts/network errors
    errorMessage: { type: String, default: null },
    latencyMs: { type: Number, required: true },
    // From Gemini's usageMetadata; zero when the call failed before a response.
    promptTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    thinkingTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }, // who asked for a draft
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiCallSchema.index({ createdAt: -1 });
aiCallSchema.index({ ticket: 1 });

export default mongoose.model('AiCall', aiCallSchema);
