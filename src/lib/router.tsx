import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface RouterContextValue {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  navigate: (to: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function getPath(): string {
  const hash = window.location.hash.slice(1);
  return hash || '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onChange = () => {
      setPath(getPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to.startsWith('#') ? to : `#${to}`;
  }, []);

  const back = useCallback(() => window.history.back(), []);

  const [pathname, queryString] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  // simple param extraction handled by route matchers in pages
  void segments;
  const query = new URLSearchParams(queryString || '');

  return (
    <RouterContext.Provider value={{ path: pathname, params, query, navigate, back }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be inside RouterProvider');
  return ctx;
}

export function useParams(): Record<string, string> {
  // params are set by the route matcher in App; pages read from a module-level store
  return currentParams;
}

let currentParams: Record<string, string> = {};
export function setParams(p: Record<string, string>) {
  currentParams = p;
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}
