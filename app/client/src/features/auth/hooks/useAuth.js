import { useAuthStore } from '../store/authStore';

export function useAuth() {
    const user = useAuthStore(s => s.user);
    const accessToken = useAuthStore(s => s.accessToken);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    const isLoading = useAuthStore(s => s.isLoading);
    const error = useAuthStore(s => s.error);
    const login = useAuthStore(s => s.login);
    const register = useAuthStore(s => s.register);
    const logout = useAuthStore(s => s.logout);

    return { user, accessToken, isAuthenticated, isLoading, error, login, register, logout };
}
