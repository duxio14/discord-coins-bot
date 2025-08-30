const simpleReply = require('../../utils/simpleReply');
const checkCooldown = require('../../utils/cooldown');

module.exports = {
  name: 'daily',
  description: "Réclamer votre récompense quotidienne.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = new Date();

    try {
      const [player, created] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: {
          coins: 0,
          lastDaily: null,
          banque: 0
        }
      });

      const cooldownStatus = checkCooldown(player, 'lastDaily', 43200000);

      const coin = client.coins;

      if (!cooldownStatus.onCooldown) {
        const reward = Math.floor(Math.random() * 5001) + 3000;

        player.lastDaily = now;
        player.coins += reward;
        await player.save();

        return simpleReply(
          message,
          `🎁 **Récompense quotidienne**\n\nVous avez reçu : \`${reward.toLocaleString('fr-FR')}\` ${coin} !`
        );
      } else {
        return simpleReply(
          message,
          `⏰ **Patiente encore un peu !**\n\nProchain claim dans : **${cooldownStatus.timeLeft}**`
        );
      }
    } catch (error) {
      console.error("Erreur dans la commande daily :", error);
      return simpleReply(
        message,
        `❌ Une erreur s'est produite pendant le traitement de votre récompense.`
      );
    }
  }
};
