# n8n-nodes-telegram-polling

An [n8n](https://n8n.io/) Community Node trigger that receives updates from Telegram using Bot API long polling (`getUpdates`), with full support for Telegram **Media Groups (Albums)**.

## Features

- **Media Group Aggregation**: When Telegram sends multiple media items (photos, videos, documents) as separate updates sharing a `media_group_id`, this node buffers the updates and emits **ONE** n8n item containing all media items for the album.
- **Caption Propagation**: Telegram typically includes a caption on only one item of an album. This node automatically finds the caption and propagates it to the top-level album object as well as every media element inside the `media` array.
- **Album Buffering Strategy**: In-memory buffer keyed by `media_group_id`. Uses a configurable timeout (default `1000 ms`). Each new update for an album resets the timer, ensuring all album items are captured.
- **Single Message Compatibility**: Standard messages without a `media_group_id` emit immediately in the original format without delay or breaking changes.
- **Long Polling & Offline Update Recovery**: Uses Telegram Bot API long polling (`getUpdates`) with strictly sequential update offsets (`update_id + 1`). If n8n or the node goes offline, pending updates queued by Telegram are retrieved and processed without loss or skipping.
- **Strict TypeScript Types**: Exposes type definitions for `AlbumItem`, `TelegramMedia`, `AlbumBuffer`, `TelegramMessage`, and `TelegramUpdate`.

## Polling Behavior & Offline Recovery

The node continuously polls the Telegram Bot API `getUpdates` endpoint. To ensure reliability:
- Tracks the latest received `update_id` and requests updates starting at `offset = lastUpdateId + 1`.
- Retains queued updates during downtime so no messages are lost when n8n restarts.
- Does not switch to webhooks or introduce update skipping logic.

## Album Buffering Strategy

Telegram transmits albums as distinct updates sent in rapid succession. When an update containing a `media_group_id` arrives:
1. The message is stored in an in-memory buffer for that `media_group_id`.
2. A timer is started (default: 1000ms).
3. If another message arrives with the same `media_group_id` before the timer expires, it is added to the buffer and the timer restarts.
4. When 1000ms passes without new messages for that album, the album is marked complete, converted to an `AlbumItem`, emitted as a single n8n execution, and removed from the buffer.

## Output Format

### For Albums (Media Groups)

```json
{
  "mediaGroupId": "13425890123456789",
  "caption": "Vacation photos from the mountains!",
  "text": "Vacation photos from the mountains!",
  "chat": {
    "id": 12345678,
    "type": "private",
    "first_name": "Jane",
    "username": "janedoe"
  },
  "from": {
    "id": 12345678,
    "is_bot": false,
    "first_name": "Jane",
    "username": "janedoe"
  },
  "date": 1700000000,
  "messageIds": [101, 102, 103],
  "media": [
    {
      "type": "photo",
      "file_id": "AgACAgIAAxkBAA...",
      "file_unique_id": "AQAD...",
      "width": 1280,
      "height": 960,
      "caption": "Vacation photos from the mountains!"
    },
    {
      "type": "photo",
      "file_id": "AgACAgIAAxkBAB...",
      "file_unique_id": "AQAE...",
      "width": 1280,
      "height": 960,
      "caption": "Vacation photos from the mountains!"
    }
  ],
  "rawMessages": [ ... ]
}
```

### For Single Messages

Standard Telegram message updates emit immediately in the native format:

```json
{
  "message_id": 104,
  "from": {
    "id": 12345678,
    "is_bot": false,
    "first_name": "Jane"
  },
  "chat": {
    "id": 12345678,
    "type": "private"
  },
  "date": 1700000100,
  "text": "Hello n8n!"
}
```

## Node Settings

- **Updates**: Multi-select types of updates to listen for (`Message`, `Edited Message`, `Channel Post`, `Edited Channel Post`, `Callback Query`).
- **Album Timeout (ms)**: Timeout in milliseconds to wait for subsequent media items in an album before emitting (default: `1000`).
- **Restrict User IDs**: Optional comma-separated list of Telegram User IDs allowed to trigger the node.

## Installation

In your n8n instance:
1. Go to **Settings > Community Nodes**.
2. Click **Install**.
3. Enter `@mentoster/n8n-nodes-telegram-polling`.

## License

[MIT](LICENSE)
