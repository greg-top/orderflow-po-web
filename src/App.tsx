import { useState } from "react";
import { ApiError, api } from "./api";
import { LoginScreen } from "./components/LoginScreen";
import { RefinementScreen } from "./components/RefinementScreen";
import type { ChatMessage, SessionRequest, SessionResponse, StudentIdentity } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
}

function downloadMarkdown(fileName: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [student, setStudent] = useState<StudentIdentity | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  const start = async (input: SessionRequest, identity: StudentIdentity) => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.startSession(input);
      setStudent(identity);
      setMessages(created.history ?? []);
      setSession(created);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const send = async (message: string) => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await api.refine(session.sessionToken, message);
      const now = new Date().toISOString();
      setMessages((current) => [
        ...current,
        { role: "STUDENT", content: message, createdAt: now },
        { role: "PRODUCT_OWNER", content: answer.message, createdAt: now },
      ]);
      setSession((current) => current ? { ...current, questionCount: answer.questionCount } : current);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.finish(session.sessionToken);
      setFinished(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const transcript = await api.transcript(session.sessionToken);
      downloadMarkdown(transcript.fileName, transcript.markdown);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!session || !student) {
    return <LoginScreen error={error} loading={busy} onStart={start} />;
  }

  return (
    <RefinementScreen
      student={student}
      session={session}
      messages={messages}
      error={error}
      busy={busy}
      finished={finished}
      onSend={send}
      onFinish={finish}
      onDownload={download}
    />
  );
}
