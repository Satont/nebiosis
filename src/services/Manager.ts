import { ArgsOf, Client, Discord, Once } from 'discordx';
import { singleton } from 'tsyringe';
import {
  Status,
  VoiceServerUpdate,
  VoiceStateUpdate,
} from "@discordx/lava-player";
import { Node } from "@discordx/lava-player";
import { GatewayDispatchEvents } from "discord.js";
import { Player } from "@discordx/lava-queue";
import { Channel } from '../entities/Channel.js';

export function getNode(client: Client): Node {
  const nodeX = new Node({
    host: {
      address: process.env.LAVA_HOST ?? "localhost",
      connectionOptions: { resumeKey: client.botId, resumeTimeout: 15 },
      port: process.env.LAVA_PORT ? Number(process.env.LAVA_PORT) : 2333,
    },

    password: process.env.LAVA_PASSWORD ?? "",

    send(guildId, packet) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        guild.shard.send(packet);
      }
    },
    shardCount: 0,
    userId: client.user?.id ?? "",
  });

  client.ws.on(
    GatewayDispatchEvents.VoiceStateUpdate,
    (data: VoiceStateUpdate) => {
      nodeX.voiceStateUpdate(data);
    }
  );

  client.ws.on(
    GatewayDispatchEvents.VoiceServerUpdate,
    (data: VoiceServerUpdate) => {
      nodeX.voiceServerUpdate(data);
    }
  );

  return nodeX;
}

@Discord()
@singleton()
export class QueueManager {
  private players!: Map<string, Player>
  private volume = 100
  private youtubeRegexp = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]+)/

  constructor(private readonly discord: Client) {
    this.players = new Map()
  }

  @Once()
  async ready(_: ArgsOf<"ready">, client: Client): Promise<void> {
    for (const [guildId] of client.guilds.cache) {
      const player = new Player(getNode(client))
      this.players.set(guildId, player)
      const queue = this.getQueue(guildId)

      if (queue) {
        queue.resume()
      }
    }
  }
  
  private getGuild(id: string) {
    return this.discord.guilds.cache.get(id)
  }

  private getQueue(guildId: string) {
    const guild = this.getGuild(guildId)
    if (!guild) return
    const queue = this.players.get(guild.id)?.queue(guild.id)
    return queue
  }

  async add(text: string, c: Channel) {
    const guild = this.getGuild(c.guildId!)
    const queue = this.getQueue(c.guildId!)

    const channel = guild?.channels.cache.get(c.voiceChannelId!)

    if (!queue || !channel || !channel.isVoiceBased()) return;

    const regexpExec = this.youtubeRegexp.exec(text)

    if (regexpExec && regexpExec.length) {
      await queue.enqueue(regexpExec[0]!)
    } else {
      const searchResponse = await queue.search(`ytsearch:${text}`);
      const track = searchResponse.tracks[0];
  
      if (!track) {
        return;
      }

      queue.tracks.push(track)
    }

    if (!queue.lavaPlayer.voiceState) {
      await queue.lavaPlayer.join(channel.id, {
        deaf: true,
      });
    }
  
    if (
      queue.lavaPlayer.status === Status.INSTANTIATED ||
      queue.lavaPlayer.status === Status.UNKNOWN ||
      queue.lavaPlayer.status === Status.ENDED ||
      !queue.lavaPlayer.playing
    ) {
      queue.playNext();
    }
  }

  async volumeEdit(volume: number, guildId: string) {
    const queue = this.getQueue(guildId)
    queue?.setVolume(this.volume + volume)
  }

  async skip(guildId: string, force = false): Promise<boolean> {
    const queue = this.getQueue(guildId)

    const length = queue?.tracks?.length || 0

    console.log(length, force)
    if (length >= 2) {
      queue?.playNext()
      return false
    }

    // stop track in queue have only 1, and broadcaster used redemption
    if ((length === 1 && force) || (!length && force)) {
      queue?.stop()
      return false
    }

    // return points to user
    if (length === 1 && !force) {
      return true
    }

    return false
  }
}