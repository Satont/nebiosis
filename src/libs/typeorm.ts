import { resolve } from 'path';
import { DataSource } from 'typeorm'
import { Channel } from '../entities/Channel.js';
import { Reward } from '../entities/Reward.js';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: resolve(process.cwd(), 'database.sqlite'),
  entities: [Channel, Reward],
  migrations: ['./src/migrations/*.ts']
})
