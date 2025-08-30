const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'dep',
  aliases: ["deposit"],
  description: "Déposer de l'argent dans votre banque.",
  usage: "<montant>",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const coin = client.coins;

    if (!args[0]) {
      return simpleReply(message, `💡 **Utilisation**\n\n\`${client.prefix}dep <montant/all>\``);
    }

    try {
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });

      if (!player) {
        return simpleReply(message, `❌ Vous n'avez pas d'argent !`);
      }

      let depositAmount = 0;
      const userCoins = player.coins || 0;

      if (args[0].toLowerCase() === 'all') {
        depositAmount = userCoins;
      } else {
        depositAmount = parseInt(args[0]);

        if (isNaN(depositAmount) || depositAmount <= 0) {
          return simpleReply(message, `❌ Veuillez spécifier un montant valide ou \`all\`.`);
        }

        if (depositAmount > userCoins) {
          return simpleReply(
            message,
            userCoins === 0
              ? `❌ Vous n'avez pas d'argent disponible.`
              : `❌ Vous n'avez que \`${userCoins.toLocaleString('fr-FR')}\` ${coin} disponible.`
          );
        }
      }

      if (depositAmount === 0) {
        return simpleReply(message, `❌ Vous n'avez pas d'argent à déposer.`);
      }

      player.coins -= depositAmount;
      player.banque = (player.banque || 0) + depositAmount;
      await player.save();

      return simpleReply(
        message,
        `🏦 **Dépôt effectué**\n\nVous avez déposé \`${depositAmount.toLocaleString('fr-FR')}\` ${coin} dans votre compte en banque.`
      );
    } catch (error) {
      console.error("Erreur dans la commande dep:", error);
      return simpleReply(message, `❌ Une erreur s'est produite lors du dépôt d'argent.`);
    }
  }
};
