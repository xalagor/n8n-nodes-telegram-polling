import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { MediaGroupBuffer } from '../src/MediaGroupBuffer.ts';
import type { TelegramMessage, AlbumItem } from '../src/types.ts';
import { isUserAllowed, extractMessageFromUpdate } from '../src/utils.ts';

function createMockUser(id: number = 12345) {
  return {
    id,
    is_bot: false,
    first_name: 'John',
    username: 'john_doe',
  };
}

function createMockChat(id: number = 99999) {
  return {
    id,
    type: 'private',
    first_name: 'John',
    username: 'john_doe',
  };
}

function createMockPhotoMessage(
  messageId: number,
  mediaGroupId?: string,
  caption?: string,
  date: number = 1600000000
): TelegramMessage {
  return {
    message_id: messageId,
    from: createMockUser(),
    chat: createMockChat(),
    date,
    media_group_id: mediaGroupId,
    caption,
    photo: [
      {
        file_id: `photo_small_${messageId}`,
        file_unique_id: `unique_small_${messageId}`,
        width: 100,
        height: 100,
      },
      {
        file_id: `photo_large_${messageId}`,
        file_unique_id: `unique_large_${messageId}`,
        width: 800,
        height: 600,
      },
    ],
  };
}

function createMockTextMessage(
  messageId: number,
  text: string,
  date: number = 1600000000
): TelegramMessage {
  return {
    message_id: messageId,
    from: createMockUser(),
    chat: createMockChat(),
    date,
    text,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Telegram Media Group Buffer & Polling Tests', () => {
  it('1. single message', () => {
    const buffer = new MediaGroupBuffer(100);
    const msg = createMockTextMessage(1, 'Hello World');

    let emittedAlbum: AlbumItem | null = null;
    buffer.addMessage(msg, (album) => {
      emittedAlbum = album;
    });

    assert.strictEqual(buffer.getPendingCount(), 0);
    assert.strictEqual(emittedAlbum, null);
  });

  it('2. album with 2 photos', async () => {
    const buffer = new MediaGroupBuffer(100);
    const msg1 = createMockPhotoMessage(101, 'album_2');
    const msg2 = createMockPhotoMessage(102, 'album_2');

    const emitted: AlbumItem[] = [];
    buffer.addMessage(msg1, (album) => emitted.push(album));
    buffer.addMessage(msg2, (album) => emitted.push(album));

    assert.strictEqual(buffer.getPendingCount(), 1);

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.mediaGroupId, 'album_2');
    assert.strictEqual(album.media.length, 2);
    assert.deepStrictEqual(album.messageIds, [101, 102]);
    assert.strictEqual(album.media[0].file_id, 'photo_large_101');
    assert.strictEqual(album.media[1].file_id, 'photo_large_102');
  });

  it('3. album with 10 photos', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    for (let i = 1; i <= 10; i++) {
      const msg = createMockPhotoMessage(200 + i, 'album_10');
      buffer.addMessage(msg, (album) => emitted.push(album));
    }

    assert.strictEqual(buffer.getPendingCount(), 1);

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.mediaGroupId, 'album_10');
    assert.strictEqual(album.media.length, 10);
    assert.strictEqual(album.messageIds.length, 10);
    assert.strictEqual(album.messageIds[0], 201);
    assert.strictEqual(album.messageIds[9], 210);
  });

  it('4. caption on first image', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    const msg1 = createMockPhotoMessage(301, 'album_cap_first', 'First image caption');
    const msg2 = createMockPhotoMessage(302, 'album_cap_first');

    buffer.addMessage(msg1, (album) => emitted.push(album));
    buffer.addMessage(msg2, (album) => emitted.push(album));

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.caption, 'First image caption');
    assert.strictEqual(album.text, 'First image caption');
    assert.strictEqual(album.media[0].caption, 'First image caption');
    assert.strictEqual(album.media[1].caption, 'First image caption');
  });

  it('5. caption on middle image', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    const msg1 = createMockPhotoMessage(401, 'album_cap_mid');
    const msg2 = createMockPhotoMessage(402, 'album_cap_mid', 'Middle image caption');
    const msg3 = createMockPhotoMessage(403, 'album_cap_mid');

    buffer.addMessage(msg1, (album) => emitted.push(album));
    buffer.addMessage(msg2, (album) => emitted.push(album));
    buffer.addMessage(msg3, (album) => emitted.push(album));

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.caption, 'Middle image caption');
    assert.strictEqual(album.media[0].caption, 'Middle image caption');
    assert.strictEqual(album.media[1].caption, 'Middle image caption');
    assert.strictEqual(album.media[2].caption, 'Middle image caption');
  });

  it('6. caption on last image', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    const msg1 = createMockPhotoMessage(501, 'album_cap_last');
    const msg2 = createMockPhotoMessage(502, 'album_cap_last');
    const msg3 = createMockPhotoMessage(503, 'album_cap_last', 'Last image caption');

    buffer.addMessage(msg1, (album) => emitted.push(album));
    buffer.addMessage(msg2, (album) => emitted.push(album));
    buffer.addMessage(msg3, (album) => emitted.push(album));

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.caption, 'Last image caption');
    assert.strictEqual(album.media[0].caption, 'Last image caption');
    assert.strictEqual(album.media[1].caption, 'Last image caption');
    assert.strictEqual(album.media[2].caption, 'Last image caption');
  });

  it('7. missing caption', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    const msg1 = createMockPhotoMessage(601, 'album_no_cap');
    const msg2 = createMockPhotoMessage(602, 'album_no_cap');

    buffer.addMessage(msg1, (album) => emitted.push(album));
    buffer.addMessage(msg2, (album) => emitted.push(album));

    await sleep(150);

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.caption, undefined);
    assert.strictEqual(album.text, undefined);
    assert.strictEqual(album.media[0].caption, undefined);
    assert.strictEqual(album.media[1].caption, undefined);
  });

  it('8. delayed last image', async () => {
    const buffer = new MediaGroupBuffer(150);
    const emitted: AlbumItem[] = [];

    const msg1 = createMockPhotoMessage(701, 'album_delayed');
    const msg2 = createMockPhotoMessage(702, 'album_delayed');
    const msg3 = createMockPhotoMessage(703, 'album_delayed');

    buffer.addMessage(msg1, (album) => emitted.push(album));

    await sleep(80); // < 150ms
    buffer.addMessage(msg2, (album) => emitted.push(album));

    await sleep(80); // < 150ms from msg2
    buffer.addMessage(msg3, (album) => emitted.push(album));

    // Total time elapsed: 160ms. Without reset, timeout would have fired at 150ms.
    assert.strictEqual(emitted.length, 0);

    await sleep(200); // Wait for timeout after msg3

    assert.strictEqual(emitted.length, 1);
    const album = emitted[0];
    assert.strictEqual(album.media.length, 3);
    assert.deepStrictEqual(album.messageIds, [701, 702, 703]);
  });

  it('9. two simultaneous albums', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emitted: AlbumItem[] = [];

    const msgA1 = createMockPhotoMessage(801, 'album_A');
    const msgB1 = createMockPhotoMessage(802, 'album_B');
    const msgA2 = createMockPhotoMessage(803, 'album_A');
    const msgB2 = createMockPhotoMessage(804, 'album_B');
    const msgB3 = createMockPhotoMessage(805, 'album_B');

    buffer.addMessage(msgA1, (album) => emitted.push(album));
    buffer.addMessage(msgB1, (album) => emitted.push(album));
    buffer.addMessage(msgA2, (album) => emitted.push(album));
    buffer.addMessage(msgB2, (album) => emitted.push(album));
    buffer.addMessage(msgB3, (album) => emitted.push(album));

    assert.strictEqual(buffer.getPendingCount(), 2);

    await sleep(150);

    assert.strictEqual(emitted.length, 2);
    const albumA = emitted.find((a) => a.mediaGroupId === 'album_A');
    const albumB = emitted.find((a) => a.mediaGroupId === 'album_B');

    assert.notStrictEqual(albumA, undefined);
    assert.notStrictEqual(albumB, undefined);

    assert.strictEqual(albumA?.media.length, 2);
    assert.strictEqual(albumB?.media.length, 3);
  });

  it('10. normal messages between albums', async () => {
    const buffer = new MediaGroupBuffer(100);
    const emittedAlbums: AlbumItem[] = [];
    const emittedSingleMessages: TelegramMessage[] = [];

    const msgA1 = createMockPhotoMessage(901, 'album_interleaved');
    const msgSingle1 = createMockTextMessage(902, 'Single Message 1');
    const msgA2 = createMockPhotoMessage(903, 'album_interleaved');
    const msgSingle2 = createMockTextMessage(904, 'Single Message 2');

    // Process msgA1
    buffer.addMessage(msgA1, (album) => emittedAlbums.push(album));

    // Process msgSingle1 immediately
    if (!msgSingle1.media_group_id) {
      emittedSingleMessages.push(msgSingle1);
    }

    // Process msgA2
    buffer.addMessage(msgA2, (album) => emittedAlbums.push(album));

    // Process msgSingle2 immediately
    if (!msgSingle2.media_group_id) {
      emittedSingleMessages.push(msgSingle2);
    }

    assert.strictEqual(emittedSingleMessages.length, 2);
    assert.strictEqual(emittedSingleMessages[0].text, 'Single Message 1');
    assert.strictEqual(emittedSingleMessages[1].text, 'Single Message 2');
    assert.strictEqual(emittedAlbums.length, 0);

    await sleep(150);

    assert.strictEqual(emittedAlbums.length, 1);
    const album = emittedAlbums[0];
    assert.strictEqual(album.mediaGroupId, 'album_interleaved');
    assert.strictEqual(album.media.length, 2);
  });

  it('User restriction utility check', () => {
    const msgAllowed = createMockTextMessage(1001, 'Allowed', 1600000000);
    msgAllowed.from = createMockUser(1111);

    const msgDenied = createMockTextMessage(1002, 'Denied', 1600000000);
    msgDenied.from = createMockUser(9999);

    assert.strictEqual(isUserAllowed(msgAllowed, '1111,2222'), true);
    assert.strictEqual(isUserAllowed(msgDenied, '1111,2222'), false);
    assert.strictEqual(isUserAllowed(msgDenied, ''), true);
  });

  it('Update message extraction check', () => {
    const msg = createMockTextMessage(2001, 'Update Test');
    const update = { update_id: 555, message: msg };
    const extracted = extractMessageFromUpdate(update);
    assert.strictEqual(extracted?.message_id, 2001);
  });
});
