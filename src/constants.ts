import { type HelixCreateCustomRewardData } from '@twurple/api';
import { RewardType } from './entities/Reward.js';

export const rewards: Array<HelixCreateCustomRewardData & { type: RewardType }> = [
  {
    title: 'Request Song',
    type: RewardType.SongRequest,
    prompt: 'Name or link to youtube song.',
    cost: 500,
    userInputRequired: true,
  },
  {
    title: 'Volume Up',
    type: RewardType.VolumeUp,
    prompt: 'Grow volume by 10 percents.',
    cost: 300,
  },
  {
    title: 'Volume Down',
    type: RewardType.VolumeDown,
    prompt: 'Reduce volume by 10 percents.',
    cost: 300,
  },
  {
    title: 'Skip Song',
    type: RewardType.SkipSong,
    prompt: 'Skip played song',
    cost: 700,
  }
]