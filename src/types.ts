export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

export interface TelegramAnimation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  media_group_id?: string;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  document?: TelegramDocument;
  audio?: TelegramAudio;
  animation?: TelegramAnimation;
  voice?: TelegramVoice;
  [key: string]: unknown;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TelegramMedia {
  type: string;
  file_id: string;
  file_unique_id: string;
  width?: number;
  height?: number;
  duration?: number;
  mime_type?: string;
  file_name?: string;
  file_size?: number;
  caption?: string;
  [key: string]: unknown;
}

export interface AlbumItem {
  mediaGroupId: string;
  caption?: string;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
  date: number;
  messageIds: number[];
  media: TelegramMedia[];
  rawMessages: TelegramMessage[];
}

export interface AlbumBufferEntry {
  mediaGroupId: string;
  messages: TelegramMessage[];
  timer: NodeJS.Timeout;
  timeoutMs: number;
  onComplete: (album: AlbumItem) => void;
}

export type AlbumBuffer = Map<string, AlbumBufferEntry>;
