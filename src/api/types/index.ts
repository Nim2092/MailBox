// Base interfaces
export interface PaginationView {
  id?: string;
  type?: string;
  first?: string;
  last?: string;
  previous?: string;
  next?: string;
}

export interface SearchMapping {
  type?: string;
  variable?: string;
  property?: string;
  required?: boolean;
}

export interface SearchView {
  type?: string;
  template?: string;
  variableRepresentation?: string;
  mapping?: SearchMapping[];
}

export interface CollectionResponse<T> {
  member: T[];
  totalItems: number;
  view?: PaginationView;
  search?: SearchView;
}

// Domain related interfaces
export interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DomainCreate {
  domain: string;
  isActive?: boolean;
}

export interface DomainUpdate {
  isActive: boolean;
}

// Account related interfaces
export interface Account {
  id: string;
  address: string;
  quota: number;
  used: number;
  isActive: boolean;
  isDeleted: boolean;
  mailboxes?: Mailbox[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountCreate {
  address: string;
  password: string;
  isActive?: boolean;
}

export interface AccountUpdate {
  password?: string;
  isActive?: boolean;
}

// Mailbox related interfaces
export interface Mailbox {
  id: string;
  path: string;
  isSystem?: boolean;
  autoDeleteEnabled?: boolean;
  autoDeleteSeconds?: number;
  totalMessages: number;
  totalUnreadMessages: number;
  account?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MailboxCreate {
  path: string;
}

export interface MailboxUpdate {
  path: string;
}

// Message related interfaces
export interface EmailAddress {
  name?: string;
  address: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  size: number;
  downloadUrl: string;
}

export interface MessageList {
  id: string;
  msgid: string;
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  intro?: string;
  isRead: boolean;
  isFlagged: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message extends MessageList {
  cc?: string[];
  bcc?: string[];
  verifications?: string[];
  autoDeleteEnabled?: boolean;
  expiresAt?: string;
  text?: string;
  html?: string[] | string;
  attachments?: MessageAttachment[];
}

export interface MessageUpdate {
  isRead?: boolean;
  isFlagged?: boolean;
  autoDeleteEnabled?: boolean;
  expiresAt?: string;
}

export interface MessageMove {
  mailbox: string;
}

export interface MessageSource {
  raw: string;
}

// Token related interfaces
export interface Token {
  id: string;
  name: string;
  description?: string;
  token?: string; // Only returned when token is created
  createdAt: string;
  updatedAt: string;
}

export interface TokenCreate {
  name: string;
  description?: string;
}

// API Client configuration
export interface SmtpDevClientConfig {
  apiKey: string;
  baseUrl?: string;
} 