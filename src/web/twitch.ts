import { container } from 'tsyringe';
import { exchangeCode, getTokenInfo } from '@twurple/auth';
import { RewardsService } from '../services/Rewards.js';
import { ChannelService } from '../services/Channel.js';
import Express from 'express';

export const express = Express()

express.get('/', async (req, res) => {
  const scopes = [
    'channel:read:redemptions',
    'channel:manage:redemptions'
  ]
  const query = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: `${process.env.SITE_URL!}/callback`,
    scope: scopes.join(' '),
    response_type: 'code',
  })
  const url = `https://id.twitch.tv/oauth2/authorize?${query}`
  res.status(301).redirect(url)
})

express.get('/callback', async (req, res) => {
  const code = req.query.code as string
  const channelsService = container.resolve(ChannelService)
  const rewardsService = container.resolve(RewardsService)

  const token = await exchangeCode(
    process.env.TWITCH_CLIENT_ID!, 
    process.env.TWITCH_CLIENT_SECRET!, 
    code, 
    `${process.env.SITE_URL!}/callback`,
  );
  const tokenInfo = await getTokenInfo(token.accessToken, process.env.TWITCH_CLIENT_ID)
  
  if (!tokenInfo?.userId || !token.refreshToken || !token.accessToken) {
    res.status(400).send('Something went wrong on getting information about your profile')
  } else {
    await channelsService.createOrUpdate(tokenInfo.userId, token.accessToken, token.refreshToken)
    rewardsService.createByChannelId(tokenInfo.userId)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.DISCORD_CLIENT_ID!,
      scope: ['bot', 'applications.commands'].join(' '),
      state: Buffer.from(JSON.stringify({ channelId: tokenInfo.userId })).toString('base64'),
      redirect_uri: `${process.env.SITE_URL!}/callback/discord`,
    })
    const discordUrl = `https://discord.com/oauth2/authorize?${params}`
    res.status(301).redirect(discordUrl)
  }
})

express.get('/callback/discord', async (req, res) => {
  const { channelId } = JSON.parse(Buffer.from(req.query.state as string, 'base64').toString())
  const channelsService = container.resolve(ChannelService)
  await channelsService.update(channelId, {
    guildId: req.query.guild_id as string,
  })

  res.send('Ok now come to discord and set your voice channel via command /setvoice')
})