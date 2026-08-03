import type {
  TelegramMessage,
  TelegramUpdate,
  TelegramMedia,
  AlbumItem,
} from './types.ts';

export function findFirstNonEmptyCaption(messages: TelegramMessage[]): string | undefined {
  for (const msg of messages) {
    if (msg.caption && msg.caption.trim().length > 0) {
      return msg.caption;
    }
  }
  for (const msg of messages) {
    if (msg.text && msg.text.trim().length > 0) {
      return msg.text;
    }
  }
  return undefined;
}

export function extractMediaFromMessage(
  msg: TelegramMessage,
  albumCaption?: string
): TelegramMedia | null {
  let media: TelegramMedia | null = null;

  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const photo = msg.photo[msg.photo.length - 1];
    media = {
      type: 'photo',
      file_id: photo.file_id,
      file_unique_id: photo.file_unique_id,
      width: photo.width,
      height: photo.height,
      file_size: photo.file_size,
    };
  } else if (msg.video) {
    const video = msg.video;
    media = {
      type: 'video',
      file_id: video.file_id,
      file_unique_id: video.file_unique_id,
      width: video.width,
      height: video.height,
      duration: video.duration,
      mime_type: video.mime_type,
      file_name: video.file_name,
      file_size: video.file_size,
    };
  } else if (msg.document) {
    const doc = msg.document;
    media = {
      type: 'document',
      file_id: doc.file_id,
      file_unique_id: doc.file_unique_id,
      mime_type: doc.mime_type,
      file_name: doc.file_name,
      file_size: doc.file_size,
    };
  } else if (msg.audio) {
    const audio = msg.audio;
    media = {
      type: 'audio',
      file_id: audio.file_id,
      file_unique_id: audio.file_unique_id,
      duration: audio.duration,
      mime_type: audio.mime_type,
      file_name: audio.file_name,
      file_size: audio.file_size,
    };
  } else if (msg.animation) {
    const anim = msg.animation;
    media = {
      type: 'animation',
      file_id: anim.file_id,
      file_unique_id: anim.file_unique_id,
      width: anim.width,
      height: anim.height,
      duration: anim.duration,
      mime_type: anim.mime_type,
      file_name: anim.file_name,
      file_size: anim.file_size,
    };
  } else if (msg.voice) {
    const voice = msg.voice;
    media = {
      type: 'voice',
      file_id: voice.file_id,
      file_unique_id: voice.file_unique_id,
      duration: voice.duration,
      mime_type: voice.mime_type,
      file_size: voice.file_size,
    };
  }

  if (media) {
    if (albumCaption !== undefined) {
      media.caption = albumCaption;
    }
  }

  return media;
}

export function buildAlbumItem(mediaGroupId: string, messages: TelegramMessage[]): AlbumItem {
  const sortedMessages = [...messages].sort((a, b) => a.message_id - b.message_id);
  const firstMessage = sortedMessages[0];
  const caption = findFirstNonEmptyCaption(sortedMessages);

  const media: TelegramMedia[] = [];
  for (const msg of sortedMessages) {
    const m = extractMediaFromMessage(msg, caption);
    if (m) {
      media.push(m);
    }
  }

  const messageIds = sortedMessages.map((m) => m.message_id);

  return {
    mediaGroupId,
    caption,
    text: caption,
    chat: firstMessage.chat,
    from: firstMessage.from,
    date: firstMessage.date,
    messageIds,
    media,
    rawMessages: sortedMessages,
  };
}

export function extractMessageFromUpdate(update: TelegramUpdate): TelegramMessage | null {
  if (update.message) return update.message;
  if (update.edited_message) return update.edited_message;
  if (update.channel_post) return update.channel_post;
  if (update.edited_channel_post) return update.edited_channel_post;
  if (update.callback_query && update.callback_query.message) {
    return update.callback_query.message;
  }
  return null;
}

export function isUserAllowed(message: TelegramMessage, allowedUserIdsStr?: string): boolean {
  if (!allowedUserIdsStr || allowedUserIdsStr.trim().length === 0) {
    return true;
  }
  const allowedIds = allowedUserIdsStr
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id));

  if (allowedIds.length === 0) {
    return true;
  }

  const userId = message.from?.id;
  if (userId === undefined) {
    return false;
  }

  return allowedIds.includes(userId);
}
