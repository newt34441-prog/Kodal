import { useEffect, useState, useCallback } from 'react';

export type AppRoute =
  | '/'
  | '/donations'
  | '/members'
  | '/accounts'
  | '/activities'
  | '/policies'
  | '/about'
  | '/blood-donors'
  | '/admin';

export function useRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return { currentPath, navigate };
}
