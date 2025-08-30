const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, messageLink } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const resolveMember = require("../../utils/resolveMember");


module.exports = {
  name: 'tinvite',
  description: "Inviter un joueur dans votre team.",
  usage: "{user}",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;

    const isOwnerOrStaff = await client.models.TeamMembers.findOne({
      where: {
        userId: userId,
        role: ['owner', 'staff']
      }
    });

    if (!isOwnerOrStaff) {
      return simpleReply(message, "\`❌\` Vous devez être membre du staff ou le propriétaire d'une équipe pour inviter quelqu'un.");
    }

    if (args.length < 1) {
      return simpleReply(message, "\`❌\` Utilisation : `tinvite [membre]`");
    }

    const member = await resolveMember(message, args);

    if (!member) {
      return simpleReply(message, "\`❌\` Vous devez mentionner un utilisateur à inviter.");
    }
    if(member.id === userId) {
      return simpleReply(message, "\`❌\` Vous etes déjà dans cette team.");
    }

    const m = await client.models.TeamMembers.findOne({
      where: {
        userId: member.id
      }
    });

    if(m){
      return simpleReply(message, `\`❌\` ${member.username} est **déjà** dans une team\`.`);
    }

    const team = await client.models.Teams.findOne({
      where: {
        id: isOwnerOrStaff.teamId
      }
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`tinvite_accept_${userId}`)
          .setLabel('Accepter')
          .setStyle(ButtonStyle.Success)
      );

    try {
      const msg = await message.channel.send({ embeds: [{
        description: `Vous avez reçu une **invitation** pour la team : \`${team.name}\`\n\n*Vous avez 1 minute pour l'accepter*`
      }], content: `<@${member.id}>`, components: [row] });

 
      const filter = (interaction) => interaction.user.id === member.id && interaction.isButton();
      const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (interaction) => {
        if (interaction.customId === `tinvite_accept_${userId}`) {
         
          try {
            await client.models.TeamMembers.create({
              teamId: team.id,
              userId: member.id,
              role: 'membre'
            });

            const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`AAAAAAAA`)
                .setLabel('Bienvenue')
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary)
            );
            collector.stop();
            await interaction.update({ content: "", embeds: [
              {
                description: `\`✅\` Vous avez rejoint l'équipe \`${team.name}\` **avec succès** !`
              }
            ], components: [row] });
          } catch (error) {
            console.error('Erreur lors de l\'ajout du membre:', error);
            collector.stop();
            await interaction.update({ content: "\`❌\` Une erreur est survenue lors de l'ajout à l'équipe.", components: [] });
          }
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          return msg.delete();
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'invitation:', error);
      simpleReply(message, "\`❌\` Une erreur est survenue lors de l'envoi de l'invitation.");
    }
  }
};
