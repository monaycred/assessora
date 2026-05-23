// ================================================
// IASMIN - Tipos TypeScript Globais
// ================================================

export type UserRole = "admin" | "member";
export type WorkspaceMemberRole = "owner" | "admin" | "member";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type MessageType = "text" | "image" | "document" | "audio" | "video";
export type ExpenseCategory =
  | "mercado"
  | "restaurante"
  | "saude"
  | "transporte"
  | "lazer"
  | "casa"
  | "outros";
export type ReminderStatus = "pending" | "sent" | "dismissed";
export type DocumentType = "pdf" | "image" | "doc" | "spreadsheet" | "other";
export type TripStatus = "planned" | "in_progress" | "completed" | "cancelled";

// ---- Usuário ----
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Workspace ----
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  joined_at: string;
  workspace?: Workspace;
  user_profile?: UserProfile;
}

// ---- WhatsApp ----
export interface AuthorizedWhatsApp {
  id: string;
  user_id: string;
  workspace_id?: string;
  phone_number: string;
  label?: string;
  is_active: boolean;
  authorized_at?: string;
  authorized_by?: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  phone_number: string;
  status: ApprovalStatus;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  workspace_id?: string;
}

// ---- Mensagens ----
export interface Message {
  id: string;
  user_id: string;
  workspace_id?: string;
  whatsapp_number: string;
  message_id: string;
  content?: string;
  message_type: MessageType;
  media_url?: string;
  raw_payload?: Record<string, unknown>;
  action_taken?: string;
  processed: boolean;
  created_at: string;
}

// ---- Financeiro ----
export interface PaymentMethod {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  type: "credit_card" | "debit_card" | "pix" | "cash" | "other";
  last_four?: string;
  owner_name?: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  workspace_id?: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  payment_method_id?: string;
  payment_method?: PaymentMethod;
  expense_date: string;
  is_shared: boolean;
  is_private: boolean;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

// ---- Lembretes ----
export interface Reminder {
  id: string;
  user_id: string;
  workspace_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  status: ReminderStatus;
  is_recurring: boolean;
  recurrence_rule?: string;
  is_private: boolean;
  created_at: string;
}

// ---- Agenda ----
export interface CalendarEvent {
  id: string;
  user_id: string;
  workspace_id?: string;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at?: string;
  all_day: boolean;
  is_private: boolean;
  google_event_id?: string;
  event_type?: string;
  created_at: string;
}

// ---- Documentos ----
export interface Document {
  id: string;
  user_id: string;
  workspace_id?: string;
  title: string;
  description?: string;
  doc_type: DocumentType;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  google_drive_id?: string;
  folder?: string;
  tags?: string[];
  is_private: boolean;
  created_at: string;
}

// ---- Listas de Compras ----
export interface ShoppingList {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  is_completed: boolean;
  is_private: boolean;
  created_at: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  is_checked: boolean;
  created_at: string;
}

// ---- Lista de Desejos ----
export interface WishlistItem {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  estimated_price?: number;
  url?: string;
  image_url?: string;
  priority: "low" | "medium" | "high";
  is_purchased: boolean;
  is_private: boolean;
  created_at: string;
}

// ---- Viagens ----
export interface Trip {
  id: string;
  user_id: string;
  workspace_id?: string;
  title: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  status: TripStatus;
  total_budget?: number;
  notes?: string;
  is_private: boolean;
  created_at: string;
}

// ---- Saúde ----
export interface HealthRecord {
  id: string;
  user_id: string;
  record_type: "consulta" | "exame" | "medicamento" | "cabelo" | "outro";
  title: string;
  description?: string;
  doctor_name?: string;
  clinic?: string;
  record_date: string;
  next_appointment?: string;
  notes?: string;
  created_at: string;
}

// ---- Google Connections ----
export interface GoogleConnection {
  id: string;
  user_id: string;
  service: "calendar" | "drive" | "gmail" | "docs" | "sheets";
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  connected_at: string;
}

// ---- AI Usage ----
export interface AIUsageLog {
  id: string;
  user_id: string;
  workspace_id?: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  action: string;
  created_at: string;
}

// ---- Audit Logs ----
export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ---- API Responses ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  total_expenses_month: number;
  total_reminders_pending: number;
  total_events_week: number;
  total_messages_today: number;
  total_tokens_month: number;
  pending_approvals: number;
}

// ---- AI Classification ----
export interface AIClassification {
  intent:
    | "expense"
    | "reminder"
    | "event"
    | "shopping_list"
    | "wishlist"
    | "document"
    | "image"
    | "health"
    | "trip"
    | "query"
    | "close_account"
    | "unknown";
  confidence: number;
  extracted_data: Record<string, unknown>;
  response_message: string;
}
