// /pages/_app.js — FINAL v2025.10Z10 (Theme + Toast + Snapshot Context)
import "../styles/globals.css";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import 'react-quill/dist/quill.snow.css';

import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SnapshotProvider } from "@/contexts/SnapshotContext";

const Sidebar = dynamic(() => import("../components/Sidebar"), { ssr: false });

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        <SnapshotProvider>
          <div className="flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 md:p-6 transition-all duration-300">
              <Component {...pageProps} />
            </main>
            <Toaster />
          </div>
        </SnapshotProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default MyApp;
