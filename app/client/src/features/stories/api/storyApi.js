import axiosInstance from '../../../api/axios';

export const storyApi = {
    getAll: async () => {
        const response = await axiosInstance.get('/stories');
        return response.data.stories;
    },

    getMy: async () => {
        const response = await axiosInstance.get('/stories/my');
        return response.data.stories;
    },

    create: async (data) => {
        const response = await axiosInstance.post('/stories', data);
        return response.data.story;
    },

    view: async (id) => {
        const response = await axiosInstance.patch(`/stories/view/${id}`);
        return response.data;
    },

    delete: async (id) => {
        const response = await axiosInstance.delete(`/stories/${id}`);
        return response.data;
    }
};
