import { EventSubMiddleware } from '@twurple/eventsub';
import { singleton } from 'tsyringe';
import lt from 'localtunnel'
import { ClientCredentialsAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import {Express} from 'express'
import { TwitchApi } from '../libs/twitchApi.js';
import { RewardsService } from '../services/Rewards.js';
import { QueueManager } from '../services/Manager.js';
import { RewardType } from '../entities/Reward.js';
import { Discord } from 'discordx';
import { ChannelService } from '../services/Channel.js';

@Discord()
@singleton()
export class EventSub {
  private middleware!: EventSubMiddleware

  constructor(
    private readonly api: TwitchApi,
    private readonly rewardsService: RewardsService,
    private readonly manager: QueueManager,
    private readonly channelService: ChannelService,
  ) {}

  async init() {
    let url: string
    if (process.env.NODE_ENV !== 'production') {
      const lUrl = await lt(process.env.PORT ? Number(process.env.PORT) : 3000)
      url = lUrl.url
    } else {
      url = process.env.SITE_URL!
    }

    url = url.replace('http://', '').replace('https://', '')

    this.middleware = new EventSubMiddleware({
      apiClient: this.api,
      hostName: url,
      secret: process.env.TWITCH_CLIENT_SECRET!,
      pathPrefix: '/eventsub',
      logger: {
        minLevel: 'debug',
      },
      strictHostCheck: true,
    })
  }

  async clearSubs() {
    const subs = this.api.eventSub.getSubscriptionsPaginated()
    for (const sub of await subs.getNext()) {
      await sub.unsubscribe()
    }
  }

  markAsReady() {
    return this.middleware.markAsReady()
  }

  apply(express: Express) {
    return this.middleware.apply(express)
  }

  async subscribeToChannel(channelId: string) {
    const api = await this.channelService.getApiInstanceById(channelId)

    await this.middleware.subscribeToChannelRedemptionAddEvents(channelId, async (data) => {
      const reward = await this.rewardsService.getById(channelId, data.rewardId)

      // todo: back user his points
      if (!reward || !reward.channel?.guildId || !reward.channel?.voiceChannelId) return;
      switch (reward.type) {
        case RewardType.SongRequest:
          this.manager.add(data.input, reward.channel)
          break;
        case RewardType.SkipSong:
          const shouldBackPoints = await this.manager.skip(reward.channel!.guildId, data.userId === channelId)
          if (shouldBackPoints) {
            await api.channelPoints
              .updateRedemptionStatusByIds(channelId, data.rewardId, [data.id], 'CANCELED')
          }
          break;
        case RewardType.VolumeDown:
        case RewardType.VolumeUp:
          this.manager.volumeEdit(reward.type === RewardType.VolumeDown ? -5 : 5, reward.channel!.guildId)
          break;
      }
    })
  }
}