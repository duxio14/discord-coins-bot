const { EmbedBuilder } = require('discord.js');
const { setTimeout } = require('timers/promises');

module.exports = {
  name: 'jackpot',
  description: "1 chance sur mille de gagner la cagnotte de beaucoup de joueurs !",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const coin = client.coins;
    const betAmount = 1000; 
    const jackpotNumber = 777; 
    
    try {
      let [jackpot] = await client.models.Jackpots.findOrCreate({
        where: { guildId },
        defaults: { guildId, amount: 0 }
      });
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });

      if (!player) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Compte inexistant')
              .setDescription(`Vous n'avez pas de compte ! Utilisez \`${client.prefix}daily\` pour commencer.`)
          ]
        });
      }

      const userCoins = player.coins || 0;

      if (userCoins < betAmount) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Fonds insuffisants')
              .setDescription(`Vous n'avez pas assez de ${coin} pour jouer au jackpot. Il vous faut \`${betAmount.toLocaleString('fr-FR')}\` ${coin}.`)
          ]
        });
      }
      jackpot.amount += betAmount;
      await jackpot.save();
      player.coins = Math.max(0, (player.coins || 0) - betAmount);
      await player.save();
      const initialEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🎰 JACKPOT 🎰')
        .setDescription(`Cagnotte actuelle: \`${jackpot.amount.toLocaleString('fr-FR')}\` ${coin}\n\nTirage en cours pour ${message.author}...`)
        .setFooter({ text: 'Le résultat sera affiché dans 5 secondes' });
      
      const embedMsg = await message.channel.send({ embeds: [initialEmbed] });
      await setTimeout(5000);
      const result = Math.floor(Math.random() * 1000) + 1;
      if (result === jackpotNumber) {
        const jackpotAmount = jackpot.amount;
        jackpot.amount = 0; // Réinitialiser la cagnotte après une victoire
        await jackpot.save();
        const winEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎉 JACKPOT! 🎉')
          .setDescription(
            `**7️⃣7️⃣7️⃣**\n\n` +
            `🌟 **FÉLICITATIONS ${message.author}!** 🌟\n\n` +
            `Vous avez gagné la **CAGNOTTE COMPLÈTE** de \`${jackpotAmount}\` ${coin}!\n` +
            `Faites un ticket et envoyez ce screen pour réclamer votre gain.`
          )
          .setTimestamp();
        
        await embedMsg.edit({ embeds: [winEmbed] });
        player.coins = (player.coins || 0) + jackpotAmount;
        await player.save();
      } else {
        const loseEmbed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('🎰 JACKPOT 🎰')
          .setDescription(
            `Cagnotte actuelle: \`${jackpot.amount}\` ${coin}\n\n` +
            `Le tirage pour ${message.author} donne...\n**${result}**\n\n` +
            `❌ Pas de chance! Ce n'est pas 777. Votre mise de \`${betAmount}\` ${coin} a été ajoutée à la cagnotte.`
          )
          .setTimestamp();
        
        await embedMsg.edit({ embeds: [loseEmbed] });
      }

    } catch (error) {
      console.error("Erreur dans la commande jackpot:", error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur s\'est produite pendant le jeu.')
        ]
      });
    }
  }
};