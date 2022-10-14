import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import type { Reward } from './Reward.js';

@Entity({
  name: 'channels'
})
export class Channel {
  @PrimaryColumn()
  id!: string

  @Column()
  accessToken!: string

  @Column()
  refreshToken!: string

  @OneToMany('Reward', 'channel')
  rewards?: Relation<Reward>

  @Column({ nullable: true })
  guildId?: string

  @Column({ nullable: true })
  voiceChannelId?: string
}