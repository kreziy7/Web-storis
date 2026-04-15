import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
    clientId:    { type: String, required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    dueDate:     { type: Date, required: true },
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    tags:        [{ type: String, trim: true }],
    isCompleted: { type: Boolean, default: false },
    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date, default: null },
    version:     { type: Number, default: 1 },
    notified:    { type: Boolean, default: false },
}, { timestamps: true });

// clientId уникален для каждого пользователя
reminderSchema.index({ clientId: 1, userId: 1 }, { unique: true });
reminderSchema.index({ userId: 1, isDeleted: 1 });
reminderSchema.index({ dueDate: 1, isDeleted: 1, notified: 1 });

export default mongoose.model('Reminder', reminderSchema);
