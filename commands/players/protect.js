const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'protect',
  description: "Vous protège des voles des autres joueurs.",
  dette: true,
  async execute(message, args, client) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`protect_duration_${message.author.id}`)
      .setPlaceholder('Choisissez la durée de protection')
      .addOptions([
        { label: 'CODE PROMOTIONNEL', value: 'promo' },
        { label: '1 heure (500 coins)', value: '1h' },
        { label: '2 heures (1000 coins)', value: '2h' },
        { label: '6 heures (2000 coins)', value: '6h' },
        { label: '12 heures (5000 coins)', value: '12h' }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return message.reply({
      embeds: [
        {
            description: `Pour vous **protéger** des vols, choississez une __durée de protection__ !`
        }
      ],
      components: [row]
    });
  }
};
