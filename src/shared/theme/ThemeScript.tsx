import React from 'react';

/**
 * Blocking script executed in the document head before first paint.
 * Reads the user's persisted theme preference ('ykp-theme-mode') from localStorage
 * and applies data-theme and baseline background styling to eliminate hydration flashes.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var m = localStorage.getItem('ykp-theme-mode');
              var mode = (m === 'dark') ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', mode);
              if (mode === 'light') {
                document.documentElement.style.backgroundColor = '#f8fafc';
                document.documentElement.style.color = '#0f172a';
              } else {
                document.documentElement.style.backgroundColor = '#0b0f19';
                document.documentElement.style.color = '#f8fafc';
              }
            } catch(e) {}
          })();
        `,
      }}
    />
  );
}

export default ThemeScript;
