import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthApiError,
  getAuthErrorMessage,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshSession = useCallback(async ({ signal } = {}) => {
    setStatus('loading');
    setAuthError(null);

    try {
      const currentUser = await getCurrentUser({ signal });
      if (signal?.aborted) return null;

      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
      return currentUser;
    } catch (error) {
      if (error?.name === 'AbortError') return null;

      setUser(null);
      if (error instanceof AuthApiError && error.status === 401) {
        setStatus('unauthenticated');
        setAuthError(null);
      } else {
        setStatus('unavailable');
        setAuthError(error);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession({ signal: controller.signal });

    return () => controller.abort();
  }, [refreshSession]);

  const login = useCallback(async (credentials) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const result = await loginRequest(credentials);
      setUser(result.user);
      setStatus('authenticated');
      return result.user;
    } catch (error) {
      setUser(null);
      if (
        error instanceof AuthApiError &&
        (error.status === 404 || error.status >= 500)
      ) {
        setStatus('unavailable');
      } else {
        setStatus('unauthenticated');
      }
      setAuthError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLogoutError(null);

    try {
      await logoutRequest();
      setUser(null);
      setStatus('unauthenticated');
      return true;
    } catch (error) {
      // A missing/expired server session is already logged out from the
      // browser's perspective. Availability errors keep the protected shell
      // visible so the user does not lose context unexpectedly.
      if (
        error instanceof AuthApiError &&
        (error.status === 401 || error.status === 404)
      ) {
        setUser(null);
        setStatus('unauthenticated');
        return true;
      }

      setLogoutError(error);
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      authError,
      logoutError,
      isSubmitting,
      login,
      logout,
      refreshSession,
      authErrorMessage: getAuthErrorMessage(
        authError,
        status === 'unavailable' ? 'bootstrap' : 'login'
      ),
      logoutErrorMessage: getAuthErrorMessage(logoutError, 'logout'),
    }),
    [
      status,
      user,
      authError,
      logoutError,
      isSubmitting,
      login,
      logout,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
