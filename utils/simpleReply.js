const { EmbedBuilder } = require('discord.js');

/**
 * Envoie un embed simple avec fond noir et description
 * @param {Message | CommandInteraction} interaction 
 * @param {string} description 
 */
module.exports = async function simpleReply(interaction, description) {
  const embed = new EmbedBuilder()
    .setColor('#2b2d31') 
    .setDescription(description);

  if ('reply' in interaction) {
    return interaction.reply({ embeds: [embed], ephemeral: false });
  } else {
    return interaction.channel.send({ embeds: [embed] });
  }
};
