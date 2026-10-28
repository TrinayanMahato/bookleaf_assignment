import mongoose from 'mongoose';

// Books still in production have null publicationDate, mrp and royaltyPerCopy.
const bookSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, unique: true }, // e.g. BK001 from the dataset
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    title: { type: String, required: true },
    isbn: String,
    genre: String,
    publicationDate: { type: Date, default: null },
    status: { type: String, required: true }, // "Published & Live" or "In Production - <stage>"
    mrp: { type: Number, default: null },
    authorRoyaltyPerCopy: { type: Number, default: null },
    totalCopiesSold: { type: Number, default: 0 },
    totalRoyaltyEarned: { type: Number, default: 0 },
    royaltyPaid: { type: Number, default: 0 },
    royaltyPending: { type: Number, default: 0 },
    lastRoyaltyPayoutDate: { type: Date, default: null },
    printPartner: { type: String, default: null },
    availableOn: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Book', bookSchema);
