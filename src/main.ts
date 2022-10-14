import 'reflect-metadata'

import 'dotenv/config'

import { container } from "tsyringe";
import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client, tsyringeDependencyRegistryEngine, DIService } from "discordx";
import { DataSource } from 'typeorm';
import { AppDataSource } from './libs/typeorm.js';
import { EventSub } from './eventsub/index.js';
import { express } from './web/twitch.js';
import { promisify } from 'node:util'
import { ChannelService } from './services/Channel.js';

DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);

container.registerInstance(DataSource, AppDataSource)

export const bot = new Client({
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ],

  silent: false,
});

container.registerInstance(Client, bot)

bot.once("ready", async () => {
  await bot.guilds.fetch();
  await bot.initApplicationCommands();

  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", (message: Message) => {
  bot.executeCommand(message);
});

async function run() {
  await AppDataSource.initialize()
  await importx(`${dirname(import.meta.url)}/{events,discordCommands}/**/*.{ts,js}`);

  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }

  await bot.login(process.env.BOT_TOKEN);

  const eventSub = container.resolve(EventSub)
  await eventSub.init()

  await eventSub.apply(express)

  const port = process.env.PORT || 3000;
  await new Promise((res) => {
    express.listen(port, () => {
      res(true)
    })
  })
  
  await eventSub.markAsReady()
  console.info('Express runned, eventsub listening.')

  const channelsService = container.resolve(ChannelService)
  const channels = await channelsService.getAll()
  if (process.env.NODE_ENV !== 'production') {
    await eventSub.clearSubs()
  }
  for (const channel of channels) {
    eventSub.subscribeToChannel(channel.id)
  }
}

run();
