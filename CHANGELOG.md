# Changelog

All notable changes to `@xalagor/n8n-nodes-telegram-polling` will be documented in this file.

## [1.1.0] - 2026-08-03

### Added
- **Media Group Aggregation**: Automatically buffers photos and media belonging to the same Telegram album (`media_group_id`) and emits a single consolidated n8n item for the entire album.
- **Caption Propagation**: Propagates the first non-empty caption found in a media group to the album item `caption` property and across all media elements in the `media` array.
- **Configurable Album Buffering**: In-memory buffer keyed by `media_group_id` with configurable timeout (`albumTimeout`, default 1000ms).
- **Strong TypeScript Types**: Added TypeScript interfaces for `AlbumBuffer`, `AlbumItem`, `TelegramMedia`, `TelegramMessage`, and `TelegramUpdate`.
- **Offline Polling & Update Recovery**: Polling logic uses Telegram Bot API update offsets (`lastUpdateId + 1`) to ensure updates accumulated during downtime are processed in sequence without skipping.
- **Comprehensive Test Suite**: Unit tests covering single messages, photo albums (2 to 10 photos), caption propagation (first, middle, last image, or missing), delayed last image, simultaneous albums, and interleaved single messages.
