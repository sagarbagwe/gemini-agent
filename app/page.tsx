"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot, Check, Copy, Menu, Moon, MoreHorizontal, Pencil, Plus, Send, Square, Sun, Trash2, X,
} from "lucide-react";

type Message = { id: string; role: "user" | "assistant" | "system"; content: string };
type Conversation = { id: string; title: string; updatedAt: string };

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function loadConversations() {
    const response = await fetch("/api/conversations");
    if (!response.ok) return;
    const data = (await response.json()) as Conversation[];
    setConversations(data);
    if (!active && data[0]) selectConversation(data[0].id);
  }

  async function selectConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) return;
    const data = await response.json();
    setActive({ id: data.id, title: data.title, updatedAt: data.updatedAt });
    setMessages(data.messages);
    setMobileOpen(false);
  }

  async function newConversation() {
    const response = await fetch("/api/conversations", { method: "POST" });
    if (!response.ok) return;
    const data = await response.json();
    setConversations((current) => [data, ...current]);
    setActive(data);
    setMessages([]);
    setMobileOpen(false);
    inputRef.current?.focus();
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const next = conversations.filter((conversation) => conversation.id !== id);
    setConversations(next);
    if (active?.id === id) {
      setActive(null);
      setMessages([]);
      if (next[0]) selectConversation(next[0].id);
    }
  }

  async function renameConversation(conversation: Conversation) {
    const title = window.prompt("Rename conversation", conversation.title);
    if (!title?.trim()) return;
    const response = await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
    });
    if (!response.ok) return;
    const updated = await response.json();
    setConversations((current) => current.map((item) => item.id === updated.id ? updated : item));
    if (active?.id === updated.id) setActive(updated);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    let conversation = active;
    if (!conversation) {
      const response = await fetch("/api/conversations", { method: "POST" });
      if (!response.ok) return;
      conversation = await response.json();
      setActive(conversation);
      setConversations((current) => [conversation!, ...current]);
    }
    if (!conversation) return;
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: text }, { id: `assistant-${Date.now()}`, role: "assistant", content: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, message: text }), signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        const chunk = decoder.decode(result.value, { stream: true });
        setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: item.content + chunk } : item));
      }
      await loadConversations();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: `Unable to generate a response: ${(error as Error).message}` } : item));
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setLoading(false);
  }

  useEffect(() => {
    void loadConversations();
    // Conversation loading is intentionally performed once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
    if (event.key === "Escape" && loading) stopGeneration();
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand"><div className="brand-mark"><Bot size={18} /></div><span>Gemini Agent</span></div>
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close sidebar"><X size={19} /></button>
        </div>
        <button className="new-chat" onClick={newConversation}><Plus size={18} /> New conversation</button>
        <div className="conversation-label">Conversations</div>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`conversation-item ${active?.id === conversation.id ? "active" : ""}`}>
              <button onClick={() => selectConversation(conversation.id)} className="conversation-select">{conversation.title}</button>
              <div className="conversation-actions">
                <button onClick={() => renameConversation(conversation)} aria-label="Rename"><Pencil size={14} /></button>
                <button onClick={() => deleteConversation(conversation.id)} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!conversations.length && <p className="empty-sidebar">Your conversations will appear here.</p>}
        </div>
        <div className="sidebar-footer">
          <button className="footer-action" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={17} /> : <Moon size={17} />} {dark ? "Light mode" : "Dark mode"}</button>
        </div>
      </aside>
      {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <section className="chat-area">
        <header className="chat-header">
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open sidebar"><Menu size={20} /></button>
          <div><h1>{active?.title || "New conversation"}</h1><p>Powered by Gemini</p></div>
          <button className="icon-button desktop-only" aria-label="More options"><MoreHorizontal size={20} /></button>
        </header>
        <div className="message-scroll">
          {!messages.length ? (
            <div className="welcome"><div className="welcome-icon"><Bot size={30} /></div><h2>How can I help you today?</h2><p>Ask anything, explore an idea, or get help with your next project.</p><div className="suggestions"><button onClick={() => setInput("Explain how caching works")}>Explain how caching works</button><button onClick={() => setInput("Help me plan a project")}>Help me plan a project</button><button onClick={() => setInput("Write a TypeScript function")}>Write a TypeScript function</button></div></div>
          ) : messages.map((message, index) => <MessageBubble key={message.id} message={message} last={index === messages.length - 1} />)}
          {loading && messages[messages.length - 1]?.content === "" && <div className="typing"><span /><span /><span /> Gemini is thinking...</div>}
        </div>
        <div className="composer-wrap">
          <form className="composer" onSubmit={sendMessage}>
            <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Message Gemini Agent..." rows={1} aria-label="Message" />
            <button className={`send-button ${loading ? "stop" : ""}`} type={loading ? "button" : "submit"} onClick={loading ? stopGeneration : undefined} disabled={!loading && !input.trim()} aria-label={loading ? "Stop generation" : "Send message"}>{loading ? <Square size={16} fill="currentColor" /> : <Send size={17} />}</button>
          </form>
          <p className="composer-hint">Enter to send · Shift+Enter for a new line · Esc to stop</p>
        </div>
      </section>
    </main>
  );
}

function MessageBubble({ message, last }: { message: Message; last: boolean }) {
  const [copied, setCopied] = useState(false);
  if (message.role === "system") return null;
  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return <article className={`message ${message.role}`}><div className="avatar">{message.role === "assistant" ? <Bot size={17} /> : "Y"}</div><div className="message-body"><div className="message-author">{message.role === "assistant" ? "Gemini Agent" : "You"}</div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (last ? "" : "No response generated.")}</ReactMarkdown></div>{message.role === "assistant" && message.content && <button className="copy-button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>}</div></article>;
}
