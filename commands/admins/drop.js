const { ActionRowBuilder, ButtonBuilder, ChannelType, ButtonStyle } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'drop',
  description: "Crée un événement drop de pièces dans un salon spécifié",
  wlOnly: true,
  async execute(message, args, client) {
    if (!message.guild) return;

    if (args.length < 2) {
      return simpleReply(message, `❌ **Erreur**\n\nUtilisation correcte: \`drop <salon> <montant>\``);
    }

    let targetChannel;
    
    if (args[0].match(/^<#(\d+)>$/)) {
      const channelId = args[0].match(/^<#(\d+)>$/)[1];
      targetChannel = message.guild.channels.cache.get(channelId);
    } 

    else if (/^\d+$/.test(args[0])) {
      targetChannel = message.guild.channels.cache.get(args[0]);
    } 

    else {
      targetChannel = message.guild.channels.cache.find(channel => 
        channel.name.toLowerCase() === args[0].toLowerCase());
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return simpleReply(message, `❌ **Erreur**\n\nSalon introuvable ou invalide.`);
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return simpleReply(message, `❌ **Erreur**\n\nLe montant doit être un nombre positif.`);
    }

    simpleReply(message, `✅ **Drop programmé**\n\nUn drop de \`${amount.toLocaleString('fr-FR')}\` ${client.coins} va être lancé dans le salon ${targetChannel}.`);

    try {
      const delay = Math.floor(Math.random() * (15000 - 3000 + 1)) + 3000;
      const dropTime = Date.now() + delay;
      
      await targetChannel.send({
        embeds: [{description:`🎁 **Drop programmé !**\n\nUn drop de \`${amount.toLocaleString('fr-FR')}\` ${client.coins} apparaîtra <t:${Math.floor(dropTime/1000)}:R>`}]
      });

      await new Promise(resolve => setTimeout(resolve, delay));

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('drop_claim')
            .setLabel('CLAIM')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰')
        );

      const dropMessage = await targetChannel.send({
        content: `💸 **Drop disponible !**\n\nSoyez le premier à cliquer pour gagner \`${amount.toLocaleString('fr-FR')}\` ${client.coins} !`,
        components: [row]
      });

      const filter = i => i.customId === 'drop_claim';
      const collector = dropMessage.createMessageComponentCollector({ 
        filter, 
        max: 1,
        time: 60000 
      });

      collector.on('collect', async interaction => {
        try {

          let player = await client.models.Players.findOne({
            where: {
              userId: interaction.user.id,
              guildId: interaction.guild.id
            }
          });

          if (!player) {
            player = await client.models.Players.create({
              userId: interaction.user.id,
              guildId: interaction.guild.id,
              coins: amount
            });
          } else {

            await player.increment('coins', { by: amount });
          }

          await dropMessage.delete()

          await interaction.channel.send({
            content: `🎉 **Félicitations <@${interaction.user.id}>!**\n\nVous avez été le plus rapide et remportez \`${amount.toLocaleString('fr-FR')}\` ${client.coins} !`,
            ephemeral: true
          });
        } catch (error) {
          console.error("Erreur lors de la collecte du drop :", error);
          await interaction.reply({
            content: "❌ Une erreur s'est produite lors de la récupération du drop.",
            ephemeral: true
          });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          dropMessage.edit({
            content: `⏱️ **Drop expiré !**\n\nPersonne n'a récupéré les \`${amount.toLocaleString('fr-FR')}\` ${client.coins} à temps.`,
            components: []           });
        }
      });
    } catch (error) {
      console.error("Erreur dans la commande drop :", error);
      await message.channel.send(`❌ **Erreur**\n\nUne erreur s'est produite lors de la création du drop.`);
    }
  }
};