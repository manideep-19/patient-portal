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

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-16 bottom-20 z-30 w-full sm:w-80 bg-ink/95 backdrop-blur-md border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold text-white">In-Call Messages</span>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {messages.length === 0 && (
          <div className="text-center text-white/30 py-8">
            <p className="text-sm">💬</p>
            <p className="mt-1">No messages yet</p>
            <p className="text-[10px] mt-0.5">Send a message to start chatting</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2.5 rounded-2xl max-w-[85%] ${
              msg.sender === "local"
                ? "ml-auto bg-brand text-white rounded-br-none"
                : "mr-auto bg-white/10 text-white rounded-bl-none"
            }`}
          >
            <div className="text-[10px] opacity-75 font-semibold mb-0.5">
              {msg.sender === "local" ? localLabel : remoteLabel} • {msg.timestamp}
            </div>
            <p className="leading-relaxed">{msg.text}</p>
          </div>
        ))}

        {/* Typing indicator */}
        {isRemoteTyping && (
          <div className="mr-auto bg-white/10 text-white rounded-2xl rounded-bl-none p-2.5 max-w-[85%]">
            <div className="text-[10px] opacity-75 font-semibold mb-0.5">{remoteLabel}</div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-brand text-white hover:bg-brand-dark cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
