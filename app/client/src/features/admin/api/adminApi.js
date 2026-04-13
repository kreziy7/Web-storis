import axios from '../../../api/axios';

const BASE = '/admin';

export const adminApi = {
    getStats: () =>
        axios.get(`${BASE}/stats`).then(r => r.data),

    getUsers: (params = {}) =>
        axios.get(`${BASE}/users`, { params }).then(r => r.data),

    getUser: (id) =>
        axios.get(`${BASE}/users/${id}`).then(r => r.data.user),

    toggleBan: (id) =>
        axios.patch(`${BASE}/users/${id}/ban`).then(r => r.data),

    toggleRole: (id) =>
        axios.patch(`${BASE}/users/${id}/role`).then(r => r.data),

    deleteUser: (id) =>
        axios.delete(`${BASE}/users/${id}`).then(r => r.data),
};
