import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class TelegramApi implements ICredentialType {
  name = 'telegramApi';
  displayName = 'Telegram API';
  documentationUrl = 'https://core.telegram.org/bots#6-botfather';
  properties: INodeProperties[] = [
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'The Telegram Bot API token from @BotFather',
    },
  ];
}
