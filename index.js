const Discord = require('discord.js');
const Slack = require('slack-client');

/** Class for GGG Discord Bot */
module.exports = class DiscordBot {
  /**
   * @param  {string} botToken
   * @param  {string} slackToken
   * @param  {string} azureConnectionString
   * @param  {string} members
   */
  constructor(botToken, slackToken, azureConnectionString, members) {
    this.botToken = botToken;
    this.discordClient = new Discord.Client();
    this.slackClient = new Slack(slackToken);
    this.discordToSlackMap = {};

    members.forEach((member) => {
      if(member.discordId) {
        this.discordToSlackMap[member.discordId] = member.slackId;
      }
    });
  }
  /**
   * @param  {array} slackIds
   */
  onlineUsersMessage(slackIds) {
    let messageString = "Nobody :feelsbadman:";
    if(slackIds.length) {
      messageString = "";
      slackIds.forEach(slackId => {
        messageString += `<@${slackId}> `
      })
    }

    return `Online now: ${messageString}`;
  }
  /**
   * @param  {string} channelIdToNotify
   * @param  {string} notifiedBySlackUserId
   */
  startSession(channelIdToNotify, notifiedBySlackUserId) {
    this.discordClient.login(this.botToken);
    let onlineUsers = [];
    let slackMessageId = '';
    let slackMessageAttachment = [
      {
          fallback: 'GGG ASSEMBLE!',
          color: '#36a64f',
          title: 'GGG ASSEMBLE!',
          title_link: 'http://www.theggg.club/',
          image_url: 'https://www.overwatchcontenders.com/images/bg/art-team-jumping.jpg',
          footer: `Notified by: <@${notifiedBySlackUserId}>}`,
          text: this.onlineUsersMessage(onlineUsers)
      },
    ];

    this.discordClient.on('ready', () => {
      // Get users that are already online.
      this.discordClient.guilds.first().fetchMembers().then(res => {
        res.members.forEach(member => {
          if (member.presence.game && member.presence.game.name === 'Overwatch' && this.discordToSlackMap[member.user.tag]) {
            onlineUsers.push(this.discordToSlackMap[member.user.tag]);
        }})
      slackMessageAttachment[0].text = this.onlineUsersMessage(onlineUsers);
      // Send intial message and set slack message id so presence updates can update the message.
      this.slackClient.sendMessage(channelIdToNotify, '<!channel>', slackMessageAttachment).then((slackResponse) => {
        slackMessageId = slackResponse.ts;
      });
      });
    });

    // handle presence updates. i.e. when user logs in and logs out of game.
    this.discordClient.on('presenceUpdate', (oldMember, newMember) => {
      if (newMember.presence.game && newMember.presence.game.name === 'Overwatch' && this.discordToSlackMap[newMember.user.tag]) {
        console.log(`${newMember.user.tag} has started playing ${newMember.presence.game.name}`);
        onlineUsers.push(this.discordToSlackMap[newMember.user.tag]);
        slackMessageAttachment[0].text = this.onlineUsersMessage(onlineUsers);

        this.slackClient
        .updateMessage(
          channelIdToNotify,
          slackMessageId,
          '<!channel>',
          slackMessageAttachment
        );
      } else {
        const index = onlineUsers.indexOf(this.discordToSlackMap[newMember.user.tag]);
        if (index >= 0) {
          onlineUsers.splice(index, 1);
          slackMessageAttachment[0].text = this.onlineUsersMessage(onlineUsers);
          this.slackClient
          .updateMessage(
            channelIdToNotify,
            slackMessageId,
            '',
            slackMessageAttachment
          );
        }
      }
    });

  }
};
