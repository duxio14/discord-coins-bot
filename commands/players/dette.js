const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');

module.exports = {
  name: 'dette',
  description: "Afficher vos dettes.",
  async execute(message, args, client) {
    if (!message.guild) return;
    
    const userId = message.author.id;
    const guildId = message.guild.id;

    const [player] = await client.models.Players.findOrCreate({
      where: { userId, guildId },
      defaults: {
        coins: 0,
        dette: 0
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('💸 Gestion de ta dette')
      .setDescription(player.dette > 0 ? `Tu as actuellement une dette de **${player.dette.toLocaleString('fr-FR')} coins**.` : "Tu n'as aucune dette !")
    let hasDebt = player.dette > 0;

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pay_debt_${userId}`).setLabel('Payer une partie').setStyle(ButtonStyle.Success).setDisabled(!hasDebt),
      new ButtonBuilder().setCustomId(`take_loan_${userId}`).setLabel('Faire un prêt').setStyle(ButtonStyle.Danger)
    );

    const sent = await message.channel.send({ embeds: [embed], components: [buttons] });
    const collector = sent.createMessageComponentCollector({ 
      time: 30000, 
      filter: i => i.user.id === userId 
    });

    collector.on('collect', async i => {
      if (i.customId === `pay_debt_${userId}`) {
        
        const modal = new ModalBuilder()
          .setCustomId(`modal_pay_debt_${userId}`)
          .setTitle('💰 Rembourser une partie de ta dette')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('amount_to_pay')
                .setLabel('Montant à payer')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        await i.showModal(modal);
      }

      if (i.customId === `take_loan_${userId}`) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_take_loan_${userId}`)
          .setTitle('💳 Faire un prêt')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('loan_amount')
                .setLabel('Combien veux-tu emprunter ? (max 100000)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        await i.showModal(modal);
      }
    });
    collector.on('end', async () => {
      if (sent.editable) {
        try {
          await sent.edit({ components: [] });
        } catch (error) {
          console.error("Couldn't edit message:", error);
        }
      }
    });
  }
};