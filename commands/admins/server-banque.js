const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'server-banque',
  description: "Affiche la banque du serveur",
  wlOnly: true,
  async execute(message, args, client) {
    if (!message.guild) return;

    const guildId = message.guild.id;

    try {
      const totalCoins = await client.models.Players.sum('coins', {
        where: { guildId }
      }) || 0;

      const formattedCoins = totalCoins.toLocaleString('fr-FR');
      const coin = client.coins;

      simpleReply(message, `🏦 **Banque du serveur**\n\nTotal des pièces en circulation : \`${formattedCoins}\` ${coin}`);
    } catch (error) {
      console.error("Erreur dans la commande server-banque :", error);
      simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite lors de la consultation de la banque.`);
    }
  }
};
