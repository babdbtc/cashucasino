import type { Metadata } from "next";
import "./globals.css";
import SideNav from "@/components/SideNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import AuthModal from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "Cashu Casino",
  description: "Play casino games with Cashu ecash - secure server-side balance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased flex min-h-screen relative overflow-x-hidden">
        <ThemeProvider>
          <AuthProvider>
            <AuthModal />
            <SideNav />
            <div className="flex-grow md:ml-64 pt-16 md:pt-0 relative z-10">
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
