import axiosInstance from '../../../api/axios';

export const profileApi = {
    updateProfile: async ({ name, email, currentPassword }) => {
        const response = await axiosInstance.put('/profile', { name, email, currentPassword });
        return response.data; // { user }
    },

    changePassword: async ({ currentPassword, newPassword }) => {
        const response = await axiosInstance.put('/profile/password', { currentPassword, newPassword });
        return response.data;
    },
};
