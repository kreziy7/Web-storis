import axiosInstance from '../../../api/axios';

export const authApi = {
    login: async (data) => {
        const response = await axiosInstance.post('/auth/login', data);
        return response.data;
    },

    register: async (data) => {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data;
    },

    logout: async () => {
        await axiosInstance.post('/auth/logout');
    },

    refresh: async () => {
        const response = await axiosInstance.post('/auth/refresh');
        return response.data;
    }
};
