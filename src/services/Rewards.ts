import { HelixCreateCustomRewardData } from '@twurple/api';
import { Discord } from 'discordx';
import { singleton } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { rewards } from '../constants.js';
import { Reward, RewardType } from '../entities/Reward.js';
import { TwitchApi } from '../libs/twitchApi.js';
import { ChannelService } from './Channel.js';

@singleton()
export class RewardsService {
  private repository: Repository<Reward>;

  constructor(
    private readonly typeorm: DataSource,
    private readonly api: TwitchApi,
    private readonly channelService: ChannelService,
  ) {
    this.repository = this.typeorm.getRepository(Reward)
  }

  async createByChannelId(channelId: string) {
    const api = await this.channelService.getApiInstanceById(channelId)
    const r = await api.channelPoints.getCustomRewards(channelId, true)

    for (const reward of await api.channelPoints.getCustomRewards(channelId, true)) {
      await api.channelPoints.deleteCustomReward(channelId, reward.id)
    }

    for (const reward of rewards) {
      try {
        const newReward = await api.channelPoints.createCustomReward(channelId, {
          cost: reward.cost,
          title: `[Nebiosis] ${reward.title}`,
          prompt: reward.prompt,
          userInputRequired: reward.userInputRequired,
        })
  
        await this.repository.save({
          channelId,
          type: reward.type,
          id: newReward.id,
        })
      } catch (e) {
        if ((e as any).message !== 'CREATE_CUSTOM_REWARD_DUPLICATE_REWARD') {
          console.info(reward, e)
        }
      }
    }
  }

  getByChannelId(channelId: string) {
    return this.repository.findBy({ channelId })
  }

  getByType(channelId: string, type: RewardType) {
    return this.repository.findOneBy({
      channelId,
      type,
    })
  }

  getById(channelId: string, id: string) {
    return this.repository.findOne({
      where: {
        channelId,
        id,
      },
      relations: {
        channel: true,
      }
    })
  }
}