export interface SyncMessage {
  type: 'text' | 'file' | 'ping';
  payload: string; // text content OR base64 data
  iv?: string;     // initialization vector for encryption
  sender?: string;
  timestamp: number;
  fileName?: string;
}

export interface HistoryItem {
  id: string;
  content: string;
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