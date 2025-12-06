
export type ConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSED';

export enum AppStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  PAIRED = 'PAIRED',
  ERROR = 'ERROR'
}

export interface SyncMessage {
  type: 'text' | 'file' | 'ping' | 'pong';
  payload: string; // Encrypted content or plain text
  iv?: string;     // Encryption IV
  sender?: string;
  timestamp: number;
  fileName?: string; // For files
  fileType?: string; // For files
}

export interface HistoryItem {
  id: string;
  content: string; // Text content or DataURL for files
  type: 'text' | 'file';
  sender: string;
  timestamp: number;
  fileName?: string;
  isSelf: boolean;
}

export interface AppSettings {
  serverUrl: string;
  deviceName: string;
  secretKey: string;
  enableNotifications: boolean;
  enableSound: boolean;
}

export interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  deviceId: string;
  encrypted: boolean;
}

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  pairingCode: string;
  serverUrl: string;
  sharedSecret: string | null;
}
