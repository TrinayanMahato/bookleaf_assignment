import mongoose from 'mongoose';

export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
// Status is never set by hand: Pending when the author raises a ticket, Answered once an admin replies.
export const STATUSES = ['Pending', 'Answered'];

// Mongo sorts strings alphabetically, so the queue sorts on this number instead.
const PRIORITY_RANK = { Critical: 1, High: 2, Medium: 3, Low: 4 };

const messageSchema = new mongoose.Schema(
  {
    // Replies can come from either collection, so the ref is resolved per message.
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'messages.senderModel', required: true },
    senderModel: { type: String, enum: ['Author', 'Admin'], required: true },
    body: { type: String, required: true },
    aiDrafted: { type: Boolean, default: false }, // sent reply started from an AI draft
  },
  { timestamps: true }
);

const noteSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null }, // null = General / Account Level
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    attachments: [
      {
        originalName: String, // shown to users
        filename: String, // stored name inside uploads/
        mimetype: String,
        size: Number,
      },
    ],
    status: { type: String, enum: STATUSES, default: 'Pending', index: true },
    category: { type: String, enum: CATEGORIES, default: 'General Inquiry', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    priorityRank: { type: Number, default: PRIORITY_RANK.Medium },
    // Where category/priority came from, so admins can see AI vs manual vs fallback.
    classificationSource: { type: String, enum: ['ai', 'fallback', 'admin'], default: 'fallback' },
    classificationReason: String, // one-line why, shown to admins in the queue
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    messages: [messageSchema], // visible to the author
    internalNotes: { type: [noteSchema], select: false }, // admin-only
    aiDraft: { body: String, generatedAt: Date }, // cached so we don't re-call the model on every open
  },
  { timestamps: true }
);

ticketSchema.pre('validate', function () {
  this.priorityRank = PRIORITY_RANK[this.priority];
});

ticketSchema.index({ status: 1, priorityRank: 1, createdAt: 1 }); // admin queue sort

export default mongoose.model('Ticket', ticketSchema);
