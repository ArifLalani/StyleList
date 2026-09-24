"use client";

import { Check } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Quiet confirmations. "Moved to Apartment", "Added to your closet".
 * They never ask anything and never block what the person is doing.
 */

interface ToastMessage {
  id: number;
  text: string;
  tone: "done" | "plain";
}

const ToastContext = createContext<(text: string, tone?: "done" | "plain") => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, tone: "done" | "plain" = "done") => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-white",
              "shadow-[0_10px_30px_rgba(20,20,24,0.28)] animate-[fade-up_0.28s_var(--ease-out-soft)_both]",
            )}
          >
            {message.tone === "done" ? (
              <Check size={18} strokeWidth={2.8} className="text-white" />
            ) : null}
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
