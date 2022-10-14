import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation, Unique } from 'typeorm';
import type { Channel } from './Channel.js';

export enum RewardType {
  SongRequest = 'SONG_REQUEST',
  SkipSong = 'SKIP_SONG',
  VolumeUp = 'VOLUME_UP',
  VolumeDown = 'VOLUME_DOWN'
}

@Entity({
  name: 'twitch_rewards'
})
@Unique('uniqueChannelAndType', ['channelId', 'type'])
export class Reward {
  @PrimaryColumn()
  id!: string;

  @ManyToOne('Channel', 'rewards')
  @JoinColumn({ name: 'channelId' })
  channel?: Relation<Channel>

  @Column()
  channelId!: string;

  @Column({ type: 'simple-enum', enum: RewardType })
  type!: RewardType
}