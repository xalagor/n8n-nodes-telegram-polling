import type {
  TelegramMessage,
  AlbumBuffer,
  AlbumBufferEntry,
  AlbumItem,
} from './types.ts';
import { buildAlbumItem } from './utils.ts';

export const DEFAULT_ALBUM_TIMEOUT_MS = 1000;

export class MediaGroupBuffer {
  private buffer: AlbumBuffer = new Map();
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_ALBUM_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  public addMessage(
    message: TelegramMessage,
    onComplete: (album: AlbumItem) => void
  ): void {
    const mediaGroupId = message.media_group_id;
    if (!mediaGroupId) {
      return;
    }

    const existing = this.buffer.get(mediaGroupId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.messages.push(message);
      existing.timer = setTimeout(() => {
        this.flushAlbum(mediaGroupId);
      }, this.timeoutMs);
    } else {
      const entry: AlbumBufferEntry = {
        mediaGroupId,
        messages: [message],
        timeoutMs: this.timeoutMs,
        onComplete,
        timer: setTimeout(() => {
          this.flushAlbum(mediaGroupId);
        }, this.timeoutMs),
      };
      this.buffer.set(mediaGroupId, entry);
    }
  }

  public flushAlbum(mediaGroupId: string): AlbumItem | null {
    const entry = this.buffer.get(mediaGroupId);
    if (!entry) {
      return null;
    }

    clearTimeout(entry.timer);
    this.buffer.delete(mediaGroupId);

    const album = buildAlbumItem(mediaGroupId, entry.messages);
    entry.onComplete(album);
    return album;
  }

  public flushAll(): AlbumItem[] {
    const albums: AlbumItem[] = [];
    const keys = Array.from(this.buffer.keys());
    for (const key of keys) {
      const album = this.flushAlbum(key);
      if (album) {
        albums.push(album);
      }
    }
    return albums;
  }

  public clear(): void {
    for (const entry of this.buffer.values()) {
      clearTimeout(entry.timer);
    }
    this.buffer.clear();
  }

  public getPendingCount(): number {
    return this.buffer.size;
  }
}
