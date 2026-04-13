import axiosInstance from '../../../api/axios';

// Server response format: { user, accessToken }
export const authApi = {
    login: async (data) => {
        const response = await axiosInstance.post('/auth/login', data);
        return response.data; // { user, accessToken }
    },

    register: async (data) => {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data; // { user, accessToken }
    },

    logout: async () => {
        await axiosInstance.post('/auth/logout');
    },

    refresh: async () => {
        const response = await axiosInstance.post('/auth/refresh');
        return response.data; // { user, accessToken }
    }
};
