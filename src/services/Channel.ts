import { singleton } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { Channel } from '../entities/Channel.js';
import { TwitchApi } from '../libs/twitchApi.js';
import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';

@singleton()
export class ChannelService {
  private repository: Repository<Channel>;

  constructor(
    private readonly typeorm: DataSource,
    private readonly api: TwitchApi,
  ) {
    this.repository = this.typeorm.getRepository(Channel)
  }

  getAll() {
    return this.repository.find()
  }

  async createOrUpdate(id: string, accessToken: string, refreshToken: string) {
    const isExists = await this.repository.count({ where: { id }})

    if (isExists > 0) {
      await this.update(id, { accessToken, refreshToken })
      return
    }

    return this.repository.save({
      id,
      accessToken,
      refreshToken,
    })
  }

  async update(id: string, data: Omit<Partial<Channel>, 'id'>) {
    const channel = await this.repository.findOneBy({ id })
    if (!channel) throw new Error('Account not found.')

    await this.repository.update(
      { id },
      data
    )
  }

  getById(id: string) {
    return this.repository.findOneBy({ id })
  }

  getBy(query: Partial<Channel>) {
    return this.repository.findOneBy(query)
  }

  async getApiInstanceById(id: string) {
    const channel = await this.getById(id)
    if (!channel) throw new Error(`Cannot find channel ${id}.`)

    const authProvider = new RefreshingAuthProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      onRefresh: async (token) => {
        const { accessToken, refreshToken } = token
        if (accessToken && refreshToken) {
          this.update(id, { 
            accessToken,
            refreshToken,
          })
        }
      }
    }, {
      expiresIn: 10,
      obtainmentTimestamp: Date.now() - 10,
      refreshToken: channel.refreshToken,
      accessToken: channel.accessToken,
    })

    return new ApiClient({
      authProvider,
    })
  }
}