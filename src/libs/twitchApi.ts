import { ApiClient } from '@twurple/api';
import { ClientCredentialsAuthProvider } from '@twurple/auth'
import { Discord } from 'discordx';
import { singleton } from 'tsyringe';

@Discord()
@singleton()
export class TwitchApi extends ApiClient {
  constructor() {
    super({
      authProvider: new ClientCredentialsAuthProvider(
        process.env.TWITCH_CLIENT_ID!, 
        process.env.TWITCH_CLIENT_SECRET!
      )
    })
  }
}