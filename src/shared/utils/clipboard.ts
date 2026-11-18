/**
 * Universal clipboard utility with fallback for non-secure contexts (e.g. plain HTTP IP addresses).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API if available and running in a Secure Context (HTTPS or localhost)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    (typeof window !== 'undefined' ? window.isSecureContext : true)
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback below
    }
  }

  // 2. Fallback for plain HTTP, IP addresses (e.g. http://10.21.10.222), or browsers where navigator.clipboard fails
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Prevent scrolling to bottom of screen in iOS / mobile
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.warn('[Clipboard] Fallback execCommand failed:', fallbackErr);
      return false;
    }
  }

  return false;
}
