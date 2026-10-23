"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import type { ChatMessage } from "@/lib/use-webrtc";

interface ChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  isRemoteTyping: boolean;
  localLabel: string;
  remoteLabel: string;
  onClose: () => void;
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatPanel({
  isOpen,
  messages,
  isRemoteTyping,
  localLabel,
  remoteLabel,
  onClose,
  onSend,
  onTyping,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRemoteTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
    onTyping(false);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.trim()) {
      onTyping(true);
      // Stop typing indicator after 2s of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    } else {
      onTyping(false);
    }
  };

  const QUICK_RESPONSES = [
    "I can hear you clearly",
    "Yes, doctor",
    "Could you repeat that?",
    "Thank you",
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-3 sm:right-6 bottom-24 z-40 w-[calc(100%-1.5rem)] sm:w-88 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            Chat with {remoteLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close Chat"
          title="Close Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs">
        {messages.length === 0 && (
          <div className="text-center text-white/40 py-10 space-y-1.5">
            <p className="text-2xl">💬</p>
            <p className="font-semibold text-white/80">Direct In-Call Chat</p>
            <p className="text-[11px] text-white/50 max-w-[200px] mx-auto">
              Messages sent here are encrypted and delivered instantly during this call.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2.5 rounded-2xl max-w-[85%] shadow-xs ${
              msg.sender === "local"
                ? "ml-auto bg-brand text-white rounded-br-none"
                : "mr-auto bg-slate-800 text-slate-100 rounded-bl-none border border-white/10"
            }`}
          >
            <div className="text-[10px] opacity-75 font-semibold mb-0.5 flex items-center justify-between gap-3">
              <span>{msg.sender === "local" ? localLabel : remoteLabel}</span>
              <span className="text-[9px] opacity-60">{msg.timestamp}</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          </div>
        ))}

        {/* Typing indicator */}
        {isRemoteTyping && (
          <div className="mr-auto bg-slate-800 text-white rounded-2xl rounded-bl-none p-2.5 max-w-[85%] border border-white/10 shadow-xs">
            <div className="text-[10px] opacity-75 font-semibold mb-1">{remoteLabel} is typing...</div>
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 bg-brand-soft rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-brand-soft rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-brand-soft rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Response Chips */}
      <div className="px-3 py-1.5 border-t border-white/10 bg-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
        {QUICK_RESPONSES.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              onSend(chip);
              onTyping(false);
            }}
            className="text-[10px] text-white/80 hover:text-white bg-white/10 hover:bg-brand/30 border border-white/15 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-white/10 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type message to doctor..."
          className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 outline-hidden focus:ring-1 focus:ring-brand border border-white/10"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-xl bg-brand text-white hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
