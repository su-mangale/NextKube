import type { Metadata } from "next";
import { ThemeRegistry, ClusterProvider, QueryProvider, ThemeScript } from "@/shared";
import { Box, Typography } from "@mui/material";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextKube - Kubernetes Operations Console",
  description: "High-performance standalone Kubernetes cluster management & operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
        <ThemeScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = { NEXT_PUBLIC_BACKEND_URL: "${process.env.NEXT_PUBLIC_BACKEND_URL || 'PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL'}" };`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <ThemeRegistry>
            <ClusterProvider>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100vh',
                  width: '100vw',
                  overflow: 'hidden',
                  bgcolor: 'background.default',
                }}
              >
                <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {children}
                </Box>
              </Box>
            </ClusterProvider>
          </ThemeRegistry>
        </QueryProvider>
      </body>
    </html>
  );
}
