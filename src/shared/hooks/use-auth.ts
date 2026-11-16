import { useQuery } from '@tanstack/react-query';

export interface AuthUser {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
  email?: string;
}

export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
}
