import { ApplicationCommandOptionType, AutocompleteInteraction, Collection, CommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { injectable } from 'tsyringe';
import { Channel } from '../entities/Channel.js';
import { ChannelService } from '../services/Channel.js';

@Discord()
@injectable()
export class SetVoice {
  constructor(private readonly channelsService: ChannelService) {}

  @Slash({
    name: 'setvoice',
    description: 'Set voice channel for playing music.',
  })
  async setVoice(@SlashOption({
    autocomplete: function (this: SetVoice,interaction: AutocompleteInteraction) {
      const channels = interaction.guild?.channels.cache
        .filter(c => c.isVoiceBased())

      if (!channels) {
        return interaction.respond([])
      }
      const mapped = channels?.mapValues(v => ({ name: v.name, value: v.id })).toJSON()
      if (mapped) {
        interaction.respond(mapped)
      }
    },
    description: 'select voice channel',
    name: 'channel',
    required: true,
    type: ApplicationCommandOptionType.String
  }) input: string, interaction: CommandInteraction) {
    interaction.deferReply()
    if (!interaction.guildId) {
      return interaction.reply('Not in the guild.')
    }
    const channel = await this.channelsService.getBy({ guildId: interaction.guildId })
    if (!channel) {
      return interaction.followUp('Cannot find twitch channel in our database.')
    }

    await this.channelsService.update(channel.id, { voiceChannelId: input })

    interaction.followUp('Voice channel setted.')
  }
}