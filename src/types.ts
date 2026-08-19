export interface StudentIdentity {
  firstName: string;
  lastName: string;
  albumNumber: string;
}

export interface SessionRequest extends StudentIdentity {
  accessCode: string;
}

export interface ChatMessage {
  role: "STUDENT" | "PRODUCT_OWNER";
  content: string;
  createdAt: string;
}

export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
  variant: "A";
  maxQuestions: number;
  questionCount: number;
  history: ChatMessage[];
}

export interface RefinementResponse {
  message: string;
  questionCount: number;
  maxQuestions: number;
}

export interface FinishResponse {
  sessionId: string;
  transcriptHash: string;
  status: "FINISHED";
}

export interface TranscriptResponse {
  sessionId: string;
  transcriptHash: string;
  markdown: string;
  fileName: string;
}
