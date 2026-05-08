import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Editor } from "./components/Editor";
import { ChatPanel } from "./components/ChatPanel";
import { DirectingPanel } from "./components/DirectingPanel";
import { StatusBar } from "./components/StatusBar";
import { ResizeHandle } from "./components/ResizeHandle";
import { SettingsPage } from "./components/SettingsPage";
import { ExplorePage } from "./components/ExplorePage";
import { AuthPage } from "./components/AuthPage";
import { CreatorUsernameStep } from "./components/CreatorUsernameStep";
import { useWordCount } from "./hooks/useWordCount";
import { useChat } from "./hooks/useChat";
import { useAuth } from "./contexts/AuthContext";
import { appendToText } from "./lib/insertAtCursor";
import { generateDirectingPlan, type DirectingPlan } from "./lib/api";
import {
  createScript,
  deleteScript,
  loadScripts,
  saveScript,
} from "./lib/scripts";
import type { Doc, SaveStatus, Settings } from "./types";
import "./App.css";

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Unknown error";
}

// chat panel width limits
const MIN_CHAT = 320;
const MAX_CHAT = 520;

const SETTINGS_KEY = "scriptstream-settings";
const DEFAULT_SETTINGS: Settings = { creatorUsername: "", categoryId: null };

function getSettingsKey(userId: string | undefined): string {
  return userId ? `${SETTINGS_KEY}:${userId}` : SETTINGS_KEY;
}

function parseSettings(raw: string | null): Settings | null {
  if (!raw) return null;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

function loadSettings(userId: string | undefined): Settings {
  try {
    const userSettings = parseSettings(
      localStorage.getItem(getSettingsKey(userId)),
    );
    if (userSettings) return userSettings;

    const legacySettings = parseSettings(localStorage.getItem(SETTINGS_KEY));
    if (legacySettings) return legacySettings;
  } catch {
    /* ignore corrupt data */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(userId: string | undefined, settings: Settings) {
  localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
}

function App() {
  const { session, user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return <AuthenticatedApp user={user} signOut={signOut} />;
}

function AuthenticatedApp({
  user,
  signOut,
}: {
  user: ReturnType<typeof useAuth>["user"];
  signOut: () => Promise<void>;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [view, setView] = useState<"editor" | "settings" | "explore">("editor");
  const [assistantView, setAssistantView] = useState<"chat" | "director">(
    "chat",
  );
  const [chatWidth, setChatWidth] = useState(400);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(user?.id),
  );
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [dirtyDocIds, setDirtyDocIds] = useState<Set<string>>(() => new Set());
  const [directingPlans, setDirectingPlans] = useState<
    Record<string, DirectingPlan>
  >({});
  const [directingErrors, setDirectingErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [generatingDirectingDocId, setGeneratingDirectingDocId] = useState<
    string | null
  >(null);

  const handleSettingsChange = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(user?.id, next);
        return next;
      });
    },
    [user?.id],
  );

  // get the current doc based on id, fall back to first doc just in case
  const currentDoc = useMemo(
    () => docs.find((d) => d.id === currentDocId) ?? docs[0],
    [docs, currentDocId],
  );

  const { words, chars, readMinutes } = useWordCount(currentDoc?.content ?? "");
  const { messages, isStreaming, send, clearMessages } = useChat(
    settings.creatorUsername,
    currentDoc?.id ?? '',
  );
  const directingPlan = currentDoc
    ? (directingPlans[currentDoc.id] ?? null)
    : null;
  const directingError = currentDoc
    ? (directingErrors[currentDoc.id] ?? null)
    : null;

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const docsRef = useRef<Doc[]>([]);

  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  useEffect(() => {
    if (!user?.id) {
      setScriptsLoading(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;

    async function hydrateScripts() {
      setScriptsLoading(true);
      setScriptError(null);
      setDirtyDocIds(new Set());

      try {
        let nextDocs = await loadScripts();

        if (nextDocs.length === 0) {
          nextDocs = [await createScript(userId)];
        }

        if (cancelled) return;

        setDocs(nextDocs);
        setCurrentDocId((previousId) =>
          nextDocs.some((doc) => doc.id === previousId)
            ? previousId
            : (nextDocs[0]?.id ?? null),
        );
        setSaveStatus("saved");
      } catch (err) {
        if (cancelled) return;
        setScriptError(`Couldn't load scripts. ${extractErrorMessage(err)}`);
      } finally {
        if (!cancelled) setScriptsLoading(false);
      }
    }

    void hydrateScripts();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Debounced Supabase autosave for edited scripts.
  useEffect(() => {
    if (scriptsLoading || dirtyDocIds.size === 0) {
      return;
    }

    const pendingIds = Array.from(dirtyDocIds);
    const pendingDocs = pendingIds
      .map((id) => docs.find((doc) => doc.id === id))
      .filter((doc): doc is Doc => Boolean(doc));

    if (pendingDocs.length === 0) {
      setDirtyDocIds(new Set());
      return;
    }

    setSaveStatus("saving");
    const t = setTimeout(() => {
      void Promise.all(pendingDocs.map(saveScript))
        .then(() => {
          setDirtyDocIds((prev) => {
            const next = new Set(prev);
            pendingDocs.forEach((savedDoc) => {
              const latestDoc = docsRef.current.find(
                (doc) => doc.id === savedDoc.id,
              );
              if (
                latestDoc?.title === savedDoc.title &&
                latestDoc.content === savedDoc.content
              ) {
                next.delete(savedDoc.id);
              }
            });
            return next;
          });
          setScriptError(null);
          setSaveStatus("saved");
        })
        .catch((err) => {
          setScriptError(`Couldn't save script. ${extractErrorMessage(err)}`);
          setSaveStatus("error");
        });
    }, 600);

    return () => clearTimeout(t);
  }, [dirtyDocIds, docs, scriptsLoading]);

  // keyboard shortcuts - cmd+j to focus chat, esc to go back to editor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
      if (
        e.key === "Escape" &&
        document.activeElement === chatInputRef.current
      ) {
        editorRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setSettings(loadSettings(user?.id));
  }, [user?.id]);

  const updateCurrentDoc = (patch: Partial<Doc>) => {
    if (!currentDocId) return;

    setDocs((prev) =>
      prev.map((d) => (d.id === currentDocId ? { ...d, ...patch } : d)),
    );
    setDirtyDocIds((prev) => new Set(prev).add(currentDocId));
  };

  // add new doc and switch to it
  const handleNewDoc = async () => {
    if (!user?.id) return;

    try {
      const newDoc = await createScript(user.id);
      setDocs((prev) => [newDoc, ...prev]);
      setCurrentDocId(newDoc.id);
      setView("editor");
      setSaveStatus("saved");
    } catch (err) {
      setScriptError(`Couldn't create script. ${extractErrorMessage(err)}`);
    }
  };

  const handleSelectDoc = (id: string) => {
    setCurrentDocId(id);
    setView("editor");
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteScript(id);
    } catch (err) {
      setScriptError(`Couldn't delete script. ${extractErrorMessage(err)}`);
      return;
    }

    setDirtyDocIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDirectingPlans((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setDirectingErrors((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    setDocs((prev) => {
      const remaining = prev.filter((d) => d.id !== id);

      if (remaining.length === 0) {
        if (user?.id) {
          void createScript(user.id).then((newDoc) => {
            setDocs([newDoc]);
            setCurrentDocId(newDoc.id);
            setSaveStatus("saved");
          });
        }
        return remaining;
      }

      if (currentDocId === id) {
        setCurrentDocId(remaining[0].id);
      }

      return remaining;
    });
  };

  const handleInsert = (content: string) => {
    if (!currentDoc) return;

    updateCurrentDoc({ content: appendToText(currentDoc.content, content) });
    setAssistantView("director");
    editorRef.current?.focus();
  };

  const handleGenerateDirectingPlan = async () => {
    if (!currentDoc) return;

    const script = currentDoc.content.trim();
    if (!script || generatingDirectingDocId) return;

    setAssistantView("director");
    setGeneratingDirectingDocId(currentDoc.id);
    setDirectingErrors((prev) => ({ ...prev, [currentDoc.id]: undefined }));

    try {
      const plan = await generateDirectingPlan(
        script,
        settings.creatorUsername,
        {
          platform: "short-form vertical video",
        },
      );
      setDirectingPlans((prev) => ({ ...prev, [currentDoc.id]: plan }));
    } catch (err) {
      setDirectingErrors((prev) => ({
        ...prev,
        [currentDoc.id]: `Couldn't generate the directing plan. ${extractErrorMessage(err)}`,
      }));
    } finally {
      setGeneratingDirectingDocId(null);
    }
  };

  const handleResize = (delta: number) => {
    setChatWidth((w) => Math.min(MAX_CHAT, Math.max(MIN_CHAT, w - delta)));
  };

  if (!settings.creatorUsername.trim() || settings.categoryId == null) {
    return (
      <CreatorUsernameStep
        user={user}
        onSave={(creatorUsername, categoryId) => {
          handleSettingsChange({ creatorUsername, categoryId });
        }}
        onSignOut={signOut}
      />
    );
  }

  if (scriptsLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="auth-loading">
        <p>{scriptError ?? "No scripts found."}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        docs={docs}
        currentDocId={currentDoc.id}
        view={view}
        creatorUsername={settings.creatorUsername}
        user={user}
        onSelectDoc={handleSelectDoc}
        onDeleteDoc={handleDeleteDoc}
        onNewDoc={handleNewDoc}
        onOpenSettings={() => setView("settings")}
        onOpenExplore={() => setView("explore")}
        onSignOut={signOut}
      />

      <div className="app-main">
        {view === "editor" && (
          <>
            <TopBar
              title={currentDoc.title}
              onTitleChange={(t) => updateCurrentDoc({ title: t })}
              saveStatus={saveStatus}
              user={user}
              creatorUsername={settings.creatorUsername}
              onOpenSettings={() => setView("settings")}
            />
            <div className="workspace">
              <main className="editor-col">
                <Editor
                  ref={editorRef}
                  value={currentDoc.content}
                  onChange={(content) => updateCurrentDoc({ content })}
                />
              </main>

              <ResizeHandle onResize={handleResize} />

              <div className="chat-col" style={{ width: chatWidth }}>
                <div
                  className="assistant-tabs"
                  role="tablist"
                  aria-label="Assistant views"
                >
                  <button
                    className={`assistant-tab ${assistantView === "chat" ? "active" : ""}`}
                    onClick={() => setAssistantView("chat")}
                    role="tab"
                    aria-selected={assistantView === "chat"}
                  >
                    AI Assistant
                  </button>
                  <button
                    className={`assistant-tab ${assistantView === "director" ? "active" : ""}`}
                    onClick={() => setAssistantView("director")}
                    role="tab"
                    aria-selected={assistantView === "director"}
                  >
                    Director
                  </button>
                </div>
                <div className="assistant-panel">
                  {assistantView === "chat" ? (
                    <ChatPanel
                      ref={chatInputRef}
                      messages={messages}
                      isStreaming={isStreaming}
                      onSend={(content) => send(content, currentDoc.content)}
                      onInsert={handleInsert}
                      onClear={clearMessages}
                    />
                  ) : (
                    <DirectingPanel
                      plan={directingPlan}
                      script={currentDoc.content}
                      isGenerating={generatingDirectingDocId === currentDoc.id}
                      error={directingError}
                      onGenerate={handleGenerateDirectingPlan}
                      onInsert={handleInsert}
                    />
                  )}
                </div>
              </div>
            </div>
            <StatusBar
              words={words}
              chars={chars}
              readMinutes={readMinutes}
              saveStatus={saveStatus}
            />
          </>
        )}
        {view === "settings" && (
          <SettingsPage
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onBack={() => setView("editor")}
            user={user}
          />
        )}
        {view === "explore" && <ExplorePage categoryId={settings.categoryId} />}
      </div>
    </div>
  );
}

export default App;
