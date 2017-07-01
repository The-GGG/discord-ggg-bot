const Discord = require('discord.js');
const Slack = require('slack-client');

/** Class for GGG Discord Bot */
module.exports = class DiscordBot {
  /**
   * @param  {string} botToken
   * @param  {string} slackToken
   * @param  {string} azureConnectionString
   */
  constructor(botToken, slackToken, azureConnectionString, members) {
    this.discordClient = new Discord.Client();
    this.discordClient.login(botToken);
    this.slackClient = new Slack(slackToken);
    this.discordToSlackMap = {};

    members.forEach((member) => {
      this.discordToSlackMap[member.DiscordId] = member.SlackId;
    });

    this.discordClient.on('ready', () => {
      console.log('Bot has connected.');
    });
  }

  startSession(channelIdToNotify, notifiedBySlackUserId) {
    let slackMessageAttachment = [
      {
          fallback: 'GGG ASSEMBLE!',
          color: '#36a64f',
          title: 'GGG ASSEMBLE!',
          title_link: 'http://www.theggg.club/',
          image_url: 'https://www.overwatchcontenders.com/images/bg/art-team-jumping.jpg',
          footer: `Notified by: <@${notifiedBySlackUserId}>}`,
      },
    ];

    // TODO: Get players that are already online.
    let onlineUsers = [];

    slackClient.sendMessage(channelIdToNotify, '', slackMessageAttachment).then((slackResponse) => {
      this.discordClient.on('presenceUpdate', (oldMember, newMember) => {
        if (newMember.presence.game) {
          console.log(`${newMember.user.tag} has started playing ${newMember.presence.game.name}`);
          onlineUsers.push(this.discordToSlackMap[newMember.user.tag]);

          slackMessageAttachment[0].text = `Online now: ${onlineUsers.join(' ')}`;

          this.slackClient
          .updateMessage(
            channelIdToNotify,
            slackResponse.tts,
            '',
            slackMessageAttachment
          );
        } else {
          console.log(`${newMember.user.tag} has finished playing ${oldMember.presence.game.name}`);
          const index = onlineUsers.indexOf(newMember.user.tag);
          if (index >= 0) {
            onlineUsers.splice(index, 1);
            slackMessageAttachment[0].text = `Online now: ${onlineUsers.join(' ')}`;
            this.slackClient
            .updateMessage(
              channelIdToNotify,
              slackResponse.tts,
              '',
              slackMessageAttachment
            );
          }
        }
      });
    });
  }
};
