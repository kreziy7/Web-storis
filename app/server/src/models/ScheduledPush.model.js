import mongoose from 'mongoose';

// Stores reminder schedules sent from frontend
// Scheduler checks this and sends FCM push at dueDate
const schema = new mongoose.Schema({
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fcmToken:         { type: String, required: true },
    reminderClientId: { type: String, required: true },
    title:            { type: String, required: true },
    body:             { type: String, default: '' },
    priority:         { type: String, default: 'medium' },
    dueDate:          { type: Date, required: true },
    sent:             { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ userId: 1, reminderClientId: 1 });
schema.index({ dueDate: 1, sent: 1 });

export default mongoose.model('ScheduledPush', schema);
