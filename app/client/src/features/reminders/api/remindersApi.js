import axiosInstance from '../../../api/axios';

export const remindersApi = {
    async getAll(params = {}) {
        const response = await axiosInstance.get('/reminders', { params });
        return response.data?.data?.reminders || [];
    },

    async create(data) {
        const response = await axiosInstance.post('/reminders', data);
        return response.data?.data?.reminder;
    },

    async update(clientId, data) {
        const response = await axiosInstance.put(`/reminders/${clientId}`, data);
        return response.data?.data?.reminder;
    },

    async remove(clientId) {
        const response = await axiosInstance.delete(`/reminders/${clientId}`);
        return response.data?.data;
    },

    async sync(payload) {
        const response = await axiosInstance.post('/sync', payload);
        return response.data?.data;
    },
};
