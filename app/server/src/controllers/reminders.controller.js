import Reminder from '../models/Reminder.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/v1/reminders
export const getAll = asyncHandler(async (req, res) => {
    const reminders = await Reminder.find({
        userId: req.user._id,
        isDeleted: false,
    }).sort({ dueDate: 1 });

    res.json({ success: true, data: reminders });
});

// POST /api/v1/reminders
export const create = asyncHandler(async (req, res) => {
    const { clientId, title, description, dueDate, priority, tags } = req.body;

    if (!clientId) throw new ApiError(400, 'clientId is required');
    if (!title) throw new ApiError(400, 'title is required');
    if (!dueDate) throw new ApiError(400, 'dueDate is required');

    // Если такой clientId уже есть — возвращаем существующий (idempotent)
    const existing = await Reminder.findOne({ clientId, userId: req.user._id });
    if (existing) {
        return res.status(200).json({ success: true, data: existing });
    }

    const reminder = await Reminder.create({
        clientId,
        userId: req.user._id,
        title,
        description: description || '',
        dueDate: new Date(dueDate),
        priority: priority || 'medium',
        tags: tags || [],
    });

    res.status(201).json({ success: true, data: reminder });
});

// PUT /api/v1/reminders/:clientId
export const update = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { title, description, dueDate, priority, tags, isCompleted, version } = req.body;

    const reminder = await Reminder.findOne({ clientId, userId: req.user._id, isDeleted: false });
    if (!reminder) throw new ApiError(404, 'Reminder not found');

    // Conflict resolution: last-write-wins по version
    if (version && version < reminder.version) {
        return res.json({ success: true, data: reminder, conflict: true });
    }

    if (title !== undefined) reminder.title = title;
    if (description !== undefined) reminder.description = description;
    if (dueDate !== undefined) {
        reminder.dueDate = new Date(dueDate);
        reminder.notified = false; // сбросить если время изменилось
    }
    if (priority !== undefined) reminder.priority = priority;
    if (tags !== undefined) reminder.tags = tags;
    if (isCompleted !== undefined) reminder.isCompleted = isCompleted;
    reminder.version = (reminder.version || 1) + 1;

    await reminder.save();

    res.json({ success: true, data: reminder });
});

// DELETE /api/v1/reminders/:clientId
export const remove = asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const reminder = await Reminder.findOne({ clientId, userId: req.user._id });
    if (!reminder) throw new ApiError(404, 'Reminder not found');

    reminder.isDeleted = true;
    reminder.deletedAt = new Date();
    await reminder.save();

    res.json({ success: true });
});

// POST /api/v1/reminders/sync
// Фронтенд отправляет batch операций: { operations: [{ type, payload }] }
export const sync = asyncHandler(async (req, res) => {
    const { operations } = req.body;

    if (!Array.isArray(operations)) throw new ApiError(400, 'operations must be array');

    const results = [];

    for (const op of operations) {
        try {
            if (op.type === 'CREATE') {
                const { clientId, title, description, dueDate, priority, tags } = op.payload;
                const existing = await Reminder.findOne({ clientId, userId: req.user._id });
                if (existing) {
                    results.push({ clientId, status: 'ok', data: existing });
                    continue;
                }
                const reminder = await Reminder.create({
                    clientId,
                    userId: req.user._id,
                    title,
                    description: description || '',
                    dueDate: new Date(dueDate),
                    priority: priority || 'medium',
                    tags: tags || [],
                });
                results.push({ clientId, status: 'created', data: reminder });

            } else if (op.type === 'UPDATE') {
                const { clientId, ...fields } = op.payload;
                const reminder = await Reminder.findOne({ clientId, userId: req.user._id });
                if (!reminder) {
                    results.push({ clientId, status: 'not_found' });
                    continue;
                }
                Object.assign(reminder, {
                    ...(fields.title !== undefined && { title: fields.title }),
                    ...(fields.description !== undefined && { description: fields.description }),
                    ...(fields.dueDate !== undefined && { dueDate: new Date(fields.dueDate), notified: false }),
                    ...(fields.priority !== undefined && { priority: fields.priority }),
                    ...(fields.tags !== undefined && { tags: fields.tags }),
                    ...(fields.isCompleted !== undefined && { isCompleted: fields.isCompleted }),
                    version: (reminder.version || 1) + 1,
                });
                await reminder.save();
                results.push({ clientId, status: 'updated', data: reminder });

            } else if (op.type === 'DELETE') {
                const { clientId } = op.payload;
                await Reminder.findOneAndUpdate(
                    { clientId, userId: req.user._id },
                    { isDeleted: true, deletedAt: new Date() }
                );
                results.push({ clientId, status: 'deleted' });
            }
        } catch (err) {
            results.push({ clientId: op.payload?.clientId, status: 'error', message: err.message });
        }
    }

    // Возвращаем также актуальный список напоминаний
    const reminders = await Reminder.find({ userId: req.user._id, isDeleted: false }).sort({ dueDate: 1 });

    res.json({ success: true, results, reminders });
});
