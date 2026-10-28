import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, unique: true }, // e.g. AUTH001 from the dataset
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: String,
    city: String,
    joinedDate: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Author', authorSchema);
