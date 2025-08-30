const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'tcreate',
  description: "Créer une team.",
  dette: true,
  async execute(message, args, client) {
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const coins = client.coins;

    const memberExists = await client.models.TeamMembers.findOne({ where: { userId } });
    if (memberExists) {
      return simpleReply(message, `🚫 Vous êtes déjà dans une équipe.`);
    }

    const player = await client.models.Players.findOne({ where: { userId, guildId } });
    if (!player) {
      return simpleReply(message, `❌ Une erreur est survenue avec vos données de joueur.`);
    }

    if (player.coins < 5000) {
      return simpleReply(message, `💸 Vous n'avez pas assez d'argent pour créer une équipe. Il vous faut \`5000\` ${coins}.`);
    }

    const confirmationEmbed = new EmbedBuilder()
      .setColor('#111111')
      .setDescription(`✨ Pour créer une équipe, vous devez payer \`5000\` ${coins}.\nSouhaitez-vous continuer ?`);

    const confirmationRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('team_create_confirmation')
        .setPlaceholder('Choisissez une option')
        .addOptions([
          {
            label: 'Oui',
            value: 'yes',
            description: 'Confirmer la création de l’équipe',
            emoji: '✅',
          },
          {
            label: 'Non',
            value: 'no',
            description: 'Annuler la création',
            emoji: '❌',
          }
        ])
    );

    const sentMessage = await message.channel.send({
      embeds: [confirmationEmbed],
      components: [confirmationRow]
    });

    const filter = (interaction) => interaction.user.id === userId;
    const collector = sentMessage.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async (interaction) => {
      if (interaction.customId !== 'team_create_confirmation') return;

      const choice = interaction.values[0];
      const teamName = `Team de ${message.author.username}`;

      if (choice === 'yes') {
        try {
          const updatedPlayer = await client.models.Players.findOne({ where: { userId, guildId } });

          if (!updatedPlayer || updatedPlayer.coins < 5000) {
            await interaction.reply({
              content: `❌ Vous n'avez plus assez d'argent pour créer une équipe.`,
              ephemeral: true
            });
            collector.stop('insufficient_funds');
            return;
          }

          updatedPlayer.coins -= 5000;
          await updatedPlayer.save();

          const team = await client.models.Teams.create({
            name: teamName,
            guildId,
            ownerId: userId,
            balance: 0,
            createdAt: new Date()
          });

          await client.models.TeamMembers.create({
            userId,
            guildId,
            teamId: team.id,
            role: 'owner'
          });

          collector.stop();
          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#111111')
                .setDescription(`🎉 Félicitations ! Vous avez __créé__ l'équipe **${teamName}**.\nFaites \`.tedit\` pour personnaliser votre team !`)
            ],
            components: []
          });
        } catch (error) {
          console.error("Erreur lors de la création de l'équipe:", error);
          return interaction.update({
            embeds: [],
            content: `❌ Une erreur est survenue pendant la création de l'équipe.`,
            components: []
          });
        }
      } else {
        collector.stop();
        return interaction.update({
          embeds: [],
          content: `❌ Création annulée.`,
          components: []
        });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        sentMessage.edit({
          embeds: [],
          content: `⏳ Temps écoulé. Aucune action prise.`,
          components: []
        });
      } else if (reason !== 'insufficient_funds') {
        sentMessage.edit({ components: [] });
      }
    });
  }
};
