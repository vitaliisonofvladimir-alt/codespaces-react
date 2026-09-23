import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AuthApiError,
  getAuthErrorMessage,
  getCurrentUser,
  requestMagicLink as requestMagicLinkRequest,
  exchangeMagicLink as exchangeMagicLinkRequest,
  logout as logoutRequest,
} from '../api/auth';

const AuthContext = createContext(null);
const MAGIC_LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function clearMagicLinkTokenFromAddress() {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  url.searchParams.delete('error');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authActionError, setAuthActionError] = useState(null);
  const [hasMagicLinkToken, setHasMagicLinkToken] = useState(
    () => new URLSearchParams(window.location.search).has('token')
      || new URLSearchParams(window.location.search).has('error'),
  );
  const hadMagicLinkTokenAtStartup = useRef(
    new URLSearchParams(window.location.search).has('token')
      || new URLSearchParams(window.location.search).has('error'),
  );
  const exchangedTokenRef = useRef(null);

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
    if (hadMagicLinkTokenAtStartup.current) return undefined;
    const controller = new AbortController();
    refreshSession({ signal: controller.signal });

    return () => controller.abort();
  }, [refreshSession]);

  const requestMagicLink = useCallback(async (email) => {
    setIsSubmitting(true);
    setMagicLinkSent(false);
    setAuthActionError(null);
    setAuthError(null);

    try {
      await requestMagicLinkRequest({ email });
      setMagicLinkSent(true);
      return true;
    } catch (error) {
      setAuthActionError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const exchangeMagicLink = useCallback(async (token) => {
    setIsSubmitting(true);
    setAuthActionError(null);
    setHasMagicLinkToken(true);

    try {
      const result = await exchangeMagicLinkRequest({ token });
      setUser(result.user);
      setStatus('authenticated');
      setMagicLinkSent(false);
      clearMagicLinkTokenFromAddress();
      setHasMagicLinkToken(false);
      return result.user;
    } catch (error) {
      setUser(null);
      setStatus('unauthenticated');
      setAuthActionError(error);
      clearMagicLinkTokenFromAddress();
      setHasMagicLinkToken(false);
      throw error;
    } finally {
      setIsSubmitting(false);
      clearMagicLinkTokenFromAddress();
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('token')) {
      if (params.has('error')) {
        clearMagicLinkTokenFromAddress();
        setAuthActionError(new AuthApiError(
          'Ссылка недействительна или устарела. Запроси новую ссылку для входа.',
          { status: 400, code: 'invalid_or_expired_link' },
        ));
        setStatus('unauthenticated');
        setHasMagicLinkToken(false);
      }
      return undefined;
    }
    const values = params.getAll('token');
    if (values.length !== 1 || !MAGIC_LINK_TOKEN_PATTERN.test(values[0])) {
      clearMagicLinkTokenFromAddress();
      setAuthActionError(new AuthApiError(
        'Ссылка недействительна или устарела. Запроси новую ссылку для входа.',
        { status: 400, code: 'invalid_or_expired_link' },
      ));
      setStatus('unauthenticated');
      setHasMagicLinkToken(false);
      return undefined;
    }
    const token = values[0];
    if (exchangedTokenRef.current === token) return undefined;
    exchangedTokenRef.current = token;
    void exchangeMagicLink(token).catch(() => {});
    return undefined;
  }, [exchangeMagicLink]);

  const clearMagicLinkNotice = useCallback(() => {
    setMagicLinkSent(false);
    setAuthActionError(null);
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
      requestMagicLink,
      magicLinkSent,
      hasMagicLinkToken,
      clearMagicLinkNotice,
      authActionErrorMessage: getAuthErrorMessage(authActionError),
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
      requestMagicLink,
      magicLinkSent,
      hasMagicLinkToken,
      clearMagicLinkNotice,
      authActionError,
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
