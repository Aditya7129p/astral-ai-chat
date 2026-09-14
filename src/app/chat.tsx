"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Copy,
  Download,
  FileText,
  ImagePlus,
  LogOut,
  Menu,
  Moon,
  Paperclip,
  Plus,
  Search,
  Send,
  Share2,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
} from "react-share";
import {
  FaEnvelope,
  FaFacebookF,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MODEL } from "@/lib/models";
import { modelKey } from "@/lib/providers";
import { profileColor, profileInitial, type Profile } from "@/lib/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string | ContentPart[];
  model?: string;
  latencyMs?: number;
  legacyId?: string;
};

type Session = {
  id: string;
  title: string;
  model?: string;
  isShared: boolean;
  updatedAt: string;
  _count?: { messages: number };
};

type ModelOption = {
  id: string;
  name: string;
  providerLabel: string;
  custom?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chat({
  initialSessionId,
}: {
  initialSessionId: string | null;
}) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    modelKey("openrouter", DEFAULT_MODEL),
  );
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ContentPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("astral-theme") as
      | "light"
      | "dark"
      | null;
    if (savedTheme) window.setTimeout(() => setTheme(savedTheme), 0);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem("astral-sidebar-collapsed") === "true") {
      window.setTimeout(() => setSidebarCollapsed(true), 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("astral-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Load sessions, profile, and models on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/sessions"),
      fetch("/api/settings/profile"),
      fetch("/api/models"),
    ])
      .then(async ([sessionsRes, profileRes, modelsRes]) => {
        if (sessionsRes.ok) setSessions(await sessionsRes.json());
        if (profileRes.ok) setProfile(await profileRes.json());
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          setModels(data.models);
          if (data.errors?.length) setToast(data.errors[0]);
        }
      })
      .catch(() => setToast("Could not load your workspace."))
      .finally(() => setWorkspaceLoading(false));
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/sessions/${sessionId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "You do not have permission to view this conversation."
              : "Could not load this conversation.",
          );
        }
        const data = await response.json();
        setMessages(data.messages);
        if (data.model) {
          setSelectedModel(
            data.model.includes(":")
              ? data.model
              : modelKey("openrouter", data.model),
          );
        }
      })
      .catch((error: Error) => setToast(error.message));
  }, [sessionId, router]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function createSession() {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(
        `${response.status}: ${data.error || "Could not create conversation."}`,
      );
      return;
    }
    setSessionId(data.id);
    setMessages([]);
    setSidebarOpen(false);
    router.push(`/${data.id}`);
    setSessions((current) => [
      {
        id: data.id,
        title: "New conversation",
        isShared: false,
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  async function deleteSession(id: string) {
    const response = await fetch(`/api/sessions/${id}/delete`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setToast("Could not delete this conversation.");
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== id));
    if (id === sessionId) {
      setSessionId(null);
      setMessages([]);
      router.push("/");
    }
  }

  async function copyMessage(message: Message) {
    const text =
      typeof message.content === "string"
        ? message.content
        : message.content
            .filter(
              (part): part is Extract<ContentPart, { type: "text" }> =>
                part.type === "text",
            )
            .map((part) => part.text)
            .join("\n");
    await navigator.clipboard.writeText(text);
    setToast("Message copied.");
  }

  async function shareMessage(message: Message) {
    if (!message.id) {
      setToast("Save the conversation first — then share individual messages.");
      return;
    }
    const response = await fetch(`/api/messages/${message.id}/share`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(
        `${response.status}: ${data.error || "Could not share message."}`,
      );
      return;
    }
    await navigator.clipboard.writeText(data.url);
    setToast("Message link copied.");
  }

  async function sendMessage() {
    const question = input.trim();
    if ((!question && !attachments.length) || loading) return;
    setLoading(true);
    setToast("");
    const nextMessages = [
      ...messages,
      {
        role: "user" as const,
        content: [
          ...(question ? [{ type: "text" as const, text: question }] : []),
          ...attachments,
        ],
      },
    ];
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    try {
      const response = await fetch("/api/hello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: nextMessages,
          model: selectedModel,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (!response.ok) {
        setMessages(messages);
        setToast(
          `${response.status}: ${data.error || "The model request failed."}`,
        );
        return;
      }
      if (!sessionId) {
        setSessionId(data.sessionId);
        router.push(`/${data.sessionId}`);
      }
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.message,
          model: data.model,
          id: data.id,
          latencyMs: data.latencyMs,
        },
      ]);
      setSessions((current) =>
        current.map((session) =>
          session.id === data.sessionId
            ? {
                ...session,
                title: question.slice(0, 90),
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );
    } catch {
      setMessages(messages);
      setToast("Network error: the model service could not be reached.");
    } finally {
      setLoading(false);
    }
  }

  async function shareSession() {
    if (!sessionId) return;
    setShareLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/share`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setToast(
          `${response.status}: ${data.error || "Could not create share link."}`,
        );
        return;
      }
      setShareUrl(data.url);
      setShareOpen(true);
    } finally {
      setShareLoading(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setToast("Link copied to clipboard.");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    files.slice(0, 3).forEach((file) => {
      if (
        file.size > 8 * 1024 * 1024 ||
        (!file.type.startsWith("image/") && file.type !== "application/pdf")
      ) {
        setToast("Only images and PDFs under 8 MB are supported.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        setAttachments((current) => [
          ...current,
          file.type === "application/pdf"
            ? {
                type: "file",
                file: { filename: file.name, file_data: String(reader.result) },
              }
            : { type: "image_url", image_url: { url: String(reader.result) } },
        ]);
      reader.readAsDataURL(file);
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem("astral-sidebar-collapsed", String(next));
      return next;
    });
  }

  // ─── Derived values ────────────────────────────────────────────────────────

  const activeTitle = sessions.find((s) => s.id === sessionId)?.title;

  const selectedName =
    models.find((model) => model.id === selectedModel)?.name ??
    (() => {
      const raw = selectedModel
        .split(":")
        .slice(1)
        .join(":")
        .replace(/:free$/, "");
      return raw === "free" ? "OpenRouter free models" : raw;
    })();

  const visibleSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderContent(content: Message["content"]) {
    if (typeof content === "string") return <p>{content}</p>;
    return (
      <>
        {content
          .filter(
            (part): part is Extract<ContentPart, { type: "text" }> =>
              part.type === "text",
          )
          .map((part) => (
            <p key={part.text}>{part.text}</p>
          ))}
        <div className="attachment-list">
          {content
            .filter((part) => part.type !== "text")
            .map((part, index) =>
              part.type === "image_url" ? (
                <div className="generated-image" key={index}>
                  <img src={part.image_url.url} alt="Generated result" />
                  <div>
                    <a href={part.image_url.url} download="astral-image.png">
                      <Download size={14} /> Download
                    </a>
                    <button
                      onClick={async () => {
                        const response = await fetch("/api/images/share", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ dataUrl: part.image_url.url }),
                        });
                        const data = await response.json();
                        if (response.ok) await copy(data.url);
                      }}
                    >
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              ) : (
                <span className="attachment-pill" key={index}>
                  <FileText size={13} /> {part.file.filename}
                </span>
              ),
            )}
        </div>
      </>
    );
  }

  // ─── JSX ───────────────────────────────────────────────────────────────────

  return (
    <main
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {/* Loading overlay */}
      {(workspaceLoading || shareLoading) && (
        <div className="workspace-loading" role="status">
          <span className="loading-orb">
            <Sparkles size={18} />
          </span>
          <span>
            {shareLoading ? "Creating share link" : "Loading your workspace"}
          </span>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="astral-symbol">
            <Sparkles size={16} />
          </span>
          <strong>ASTRAL</strong>
          <button
            className="icon-button sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <Menu size={18} />
          </button>
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-button" onClick={createSession}>
          <Plus size={16} />
          <span>New conversation</span>
        </button>

        <label className="search-box">
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </label>

        <div className="history-label">YOUR CONVERSATIONS</div>

        <nav className="conversation-list">
          {visibleSessions.map((session) => (
            <Link
              key={session.id}
              className={session.id === sessionId ? "active" : ""}
              href={`/${session.id}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{session.title}</span>
              <small>
                {new Date(session.updatedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
              <button
                className="history-delete"
                type="button"
                aria-label={`Delete ${session.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void deleteSession(session.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/settings">
            <Settings size={14} />
            <span>Settings</span>
          </Link>
          <button onClick={signOut}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* ── Main workspace ───────────────────────────────────────────────────── */}
      <section className="workspace">
        <header className="workspace-header">
          <button
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={19} />
          </button>

          <div className="header-context">
            <span className="eyebrow">PRIVATE WORKSPACE</span>
            <span>{activeTitle || "New conversation"}</span>
          </div>

          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {sessionId && (
              <button
                className="share-action"
                onClick={shareSession}
                disabled={shareLoading}
              >
                {shareLoading ? (
                  <span className="share-spinner" aria-hidden="true" />
                ) : (
                  <Share2 size={15} />
                )}
                {shareLoading ? "Creating link" : "Share chat"}
              </button>
            )}

            {profile && (
              <div className="profile-menu-wrap">
                <button
                  className="user-badge"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                >
                  {profile.avatarDataUrl ? (
                    <img src={profile.avatarDataUrl} alt="" />
                  ) : (
                    <span style={{ background: profileColor(profile.username) }}>
                      {profileInitial(profile.username)}
                    </span>
                  )}
                  <b>{profile.username}</b>
                  <UserRound size={14} />
                </button>
                {profileOpen && (
                  <div className="profile-menu">
                    <strong>{profile.username}</strong>
                    <Link href="/settings">
                      <Settings size={14} /> Settings
                    </Link>
                    <button onClick={signOut}>
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Conversation ──────────────────────────────────────────────────── */}
        <div className="conversation-stage">
          {messages.length === 0 && (
            <div className="conversation-intro">
              <span className="intro-kicker">ASTRAL / CONVERSATION</span>
              <h1>
                {profile
                  ? `Hello, ${profile.username}`
                  : "A clear place to think."}
              </h1>
              <p>
                {activeTitle ||
                  "Your ideas, tools, and model context in one private thread."}
              </p>
            </div>
          )}

          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-orbit">
                  <Sparkles size={24} />
                </div>
                <h2>What should we explore?</h2>
                <p>
                  Start a conversation, attach a file, or choose a model below.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <article
                className={`message message-${message.role}`}
                key={message.id ?? `${message.role}-${index}`}
              >
                <div className="message-mark">
                  {message.role === "assistant" ? (
                    <Sparkles size={14} />
                  ) : (
                    profileInitial(profile?.username ?? "Y")
                  )}
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <strong>
                      {message.role === "assistant"
                        ? "Astral"
                        : (profile?.username ?? "You")}
                    </strong>
                    {message.model && <span>{message.model}</span>}
                  </div>
                  {renderContent(message.content)}
                  {message.latencyMs && (
                    <div className="message-foot">
                      {(message.latencyMs / 1000).toFixed(1)}s
                    </div>
                  )}
                  <div className="message-actions">
                    <button
                      type="button"
                      onClick={() => void copyMessage(message)}
                      aria-label="Copy message"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void shareMessage(message)}
                      aria-label="Share message"
                    >
                      <Share2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {loading && (
              <article className="message message-assistant">
                <div className="message-mark">
                  <Sparkles size={14} />
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <strong>Astral</strong>
                    <span>Thinking</span>
                  </div>
                  <div className="typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>

        {/* ── Composer ──────────────────────────────────────────────────────── */}
        <div className="composer-wrap">
          <div className="composer-model">
            <label>
              <Sparkles size={13} /> MODEL
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
              >
                {models
                  .filter((model) => model.custom)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.providerLabel}
                    </option>
                  ))}
                {models
                  .filter((model) => !model.custom)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.providerLabel}
                    </option>
                  ))}
              </select>
            </label>
            <span>{selectedName || "Connect a provider in Settings"}</span>
          </div>

          {attachments.length > 0 && (
            <div className="attachment-tray">
              {attachments.map((attachment, index) => (
                <span key={index}>
                  {attachment.type === "file" ? (
                    <FileText size={13} />
                  ) : (
                    <ImagePlus size={13} />
                  )}{" "}
                  {attachment.type === "file"
                    ? attachment.file.filename
                    : "Image"}
                  <button
                    aria-label="Remove attachment"
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="composer">
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept="image/*,.pdf"
              multiple
              onChange={handleFiles}
            />
            <button
              className="icon-button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything..."
              rows={1}
            />
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !attachments.length)}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast" role="status">
          <Bell size={16} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Share modal ───────────────────────────────────────────────────────── */}
      {shareOpen && (
        <div className="modal-backdrop" onClick={() => setShareOpen(false)}>
          <div
            className="share-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShareOpen(false)}
              aria-label="Close share dialog"
            >
              <X size={17} />
            </button>
            <span className="modal-icon">
              <Share2 size={18} />
            </span>
            <h2>Share this conversation</h2>
            <p>Anyone with this link can view a read-only copy.</p>
            <div className="share-url">
              <input readOnly value={shareUrl} />
              <button onClick={() => copy(shareUrl)} aria-label="Copy link">
                <Copy size={15} />
              </button>
            </div>
            <div className="share-providers">
              <TwitterShareButton url={shareUrl}>
                <span title="Share on X" aria-label="Share on X">
                  <FaXTwitter />
                </span>
              </TwitterShareButton>
              <FacebookShareButton url={shareUrl}>
                <span title="Share on Facebook" aria-label="Share on Facebook">
                  <FaFacebookF />
                </span>
              </FacebookShareButton>
              <LinkedinShareButton url={shareUrl}>
                <span title="Share on LinkedIn" aria-label="Share on LinkedIn">
                  <FaLinkedinIn />
                </span>
              </LinkedinShareButton>
              <EmailShareButton url={shareUrl}>
                <span title="Share by email" aria-label="Share by email">
                  <FaEnvelope />
                </span>
              </EmailShareButton>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
