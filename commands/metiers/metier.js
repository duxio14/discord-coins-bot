const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const metiers = require('./metierData'); 
const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'metiers',
  description: "Métiers disponibles",
  async execute(message, args, client) {
    const userId = message.author.id;

    const legalJobs = Object.entries(metiers.metierLegal);
    const illegalJobs = Object.entries(metiers.metierIllegal);

    const legalSelect = new StringSelectMenuBuilder()
      .setCustomId(`metier_select_legal_${userId}`)
      .setPlaceholder("💼 Choisis un métier légal")
      .addOptions(legalJobs.map(([key, data]) => ({
        label: data.nom,
        description: `Formation: ${data.prix} coins`,
        value: key,
      })));

    const illegalSelect = new StringSelectMenuBuilder()
      .setCustomId(`metier_select_illegal_${userId}`)
      .setPlaceholder("🕶️ Choisis un métier illégal")
      .addOptions(illegalJobs.map(([key, data]) => ({
        label: data.nom + " > " + (data.description ? data.description : ""),
        description: `Formation: ${data.prix} coins`,
        value: key,
      })));

    const row1 = new ActionRowBuilder().addComponents(legalSelect);
    const row2 = new ActionRowBuilder().addComponents(illegalSelect);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💼 Choisissez vos métiers")
          .setDescription("Vous pouvez sélectionner un métier **légal** et un métier **illégal**.\nUtilisez les menus ci-dessous.")
          .setColor(0x00AE86)
      ],
      components: [row1, row2]
    });
  }
};
