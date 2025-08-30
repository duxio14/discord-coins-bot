const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'tedit',
  description: "Modifier les paramètres de votre team.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;

    const teamMember = await client.models.TeamMembers.findOne({
      where: { userId }
    });
    if (!teamMember) {
      return simpleReply(message, `❌ Vous n'avez pas de team à éditer.`);
    }

    const team = await client.models.Teams.findOne({
      where: { id: teamMember.teamId }
    });

    const members = await client.models.TeamMembers.findAll({
      where: { teamId: team.id }
    });

    if (!members.length) {
      return simpleReply(message, `❌ Votre team n'a aucun membre pour l'instant.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x2F3136)
      .setTitle(`⚙️ Édition de l'équipe`)
      .setDescription(`Voici les paramètres actuels de votre équipe :`)
      .addFields(
        {
          name: `🏷️ Nom de l'équipe`,
          value: `> **${team.name}**`,
          inline: false
        },
        {
          name: `👥 Limite de membres`,
          value: `> **${team.maxMembers}** membres`,
          inline: false
        },
        {
          name: `🔒 Mot de passe`,
          value: team.password ? `> ||************||` : '> Aucun mot de passe défini',
          inline: false
        }
      )
      .setFooter({ text: `Modification par ${message.author.username}` })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tedit_${userId}_nom`)
        .setLabel('Modifier Nom')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tedit_${userId}_limit`)
        .setLabel('Modifier Limite')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tedit_${userId}_password`)
        .setLabel('Modifier Mot de passe')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tedit_${userId}_cancel`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Danger)
    );

    const gradeEmojis = {
      owner: '👑',
      staff: '🛡️',
      ainé: '🌟',
      membre: '👤'
    };

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`tedit_${userId}_select_member`)
      .setPlaceholder(`👥 Membres de l'équipe`)
      .addOptions(
        members.map(member => {
          const memberData = message.guild.members.cache.get(member.userId);
          const username = memberData?.user.username || 'Utilisateur inconnu';

          let role = member.role || 'membre';
          role = role.toLowerCase();

          const emoji = gradeEmojis[role] || '👤';

          return {
            label: `${emoji} ${username} (${role})`,
            value: member.userId
          };
        })
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [buttonRow, selectRow] });
  }
};
