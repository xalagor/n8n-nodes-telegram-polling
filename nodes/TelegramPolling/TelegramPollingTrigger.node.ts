import type {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  INodeExecutionData,
} from 'n8n-workflow';
import type { TelegramUpdate, TelegramMessage } from '../../src/types.ts';
import { MediaGroupBuffer, DEFAULT_ALBUM_TIMEOUT_MS } from '../../src/MediaGroupBuffer.ts';
import type {
  extractMessageFromUpdate,
  isUserAllowed,
} from '../../src/utils.ts';

export class TelegramPollingTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Telegram Polling Trigger',
    name: 'telegramPollingTrigger',
    icon: 'file:telegram.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts workflow on Telegram updates via long polling with Media Group support',
    defaults: {
      name: 'Telegram Polling Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'telegramApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Updates',
        name: 'updates',
        type: 'multiOptions',
        options: [
          { name: 'Message', value: 'message' },
          { name: 'Edited Message', value: 'edited_message' },
          { name: 'Channel Post', value: 'channel_post' },
          { name: 'Edited Channel Post', value: 'edited_channel_post' },
          { name: 'Callback Query', value: 'callback_query' },
        ],
        default: ['message'],
        description: 'Types of updates to receive',
      },
      {
        displayName: 'Album Timeout (ms)',
        name: 'albumTimeout',
        type: 'number',
        default: DEFAULT_ALBUM_TIMEOUT_MS,
        description: 'Time in milliseconds to wait for additional media in an album before emitting',
      },
      {
        displayName: 'Restrict User IDs',
        name: 'restrictUserIds',
        type: 'string',
        default: '',
        placeholder: '123456,789012',
        description: 'Comma-separated list of Telegram User IDs allowed to trigger this workflow. Leave empty to allow all.',
      },
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    const credentials = await this.getCredentials('telegramApi');
    const accessToken = credentials.accessToken as string;
    const allowedUpdates = (this.getNodeParameter('updates', []) as string[]) || ['message'];
    const restrictUserIds = (this.getNodeParameter('restrictUserIds', '') as string) || '';
    const albumTimeout = (this.getNodeParameter('albumTimeout', DEFAULT_ALBUM_TIMEOUT_MS) as number) || DEFAULT_ALBUM_TIMEOUT_MS;

    const mediaGroupBuffer = new MediaGroupBuffer(albumTimeout);

    let isPolling = true;
    let offset = 0;

    const emitData = (item: Record<string, unknown>) => {
      const executionData: INodeExecutionData[] = [{ json: item }];
      this.emit([executionData]);
    };

    const poll = async () => {
      while (isPolling) {
        try {
          const response = await this.helpers.request({
            method: 'POST',
            url: `https://api.telegram.org/bot${accessToken}/getUpdates`,
            body: {
              offset,
              timeout: 30,
              allowed_updates: allowedUpdates,
            },
            json: true,
          });

          if (response && response.ok && Array.isArray(response.result)) {
            const updates = response.result as TelegramUpdate[];

            for (const update of updates) {
              if (update.update_id >= offset) {
                offset = update.update_id + 1;
              }

              const message = extractMessageFromUpdate(update);

              if (message) {
                if (!isUserAllowed(message, restrictUserIds)) {
                  continue;
                }

                if (message.media_group_id) {
                  mediaGroupBuffer.addMessage(message, (albumItem) => {
                    emitData(albumItem as unknown as Record<string, unknown>);
                  });
                } else {
                  emitData((update.message || update) as unknown as Record<string, unknown>);
                }
              } else {
                emitData(update as unknown as Record<string, unknown>);
              }
            }
          }
        } catch (error) {
          // If polling fails, wait briefly before retrying
          if (isPolling) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    };

    // Start polling in background
    poll();

    return {
      closeFunction: async () => {
        isPolling = false;
        mediaGroupBuffer.clear();
      },
    };
  }
}
