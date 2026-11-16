export const getBackendUrl = (): string => {
  // Always use relative paths on the client side to route through Next.js server proxy rewrites
  if (typeof window !== 'undefined') {
    return '';
  }

  // Server-side rendering or build-time inlining
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url || url === 'PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL') {
    return 'http://localhost:8080';
  }
  return url;
};
