const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'tdep',
  description: "Déposer de l'argent dans la banque de la team.",
  usage: "<montant>",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!args[0]) {
      return simpleReply(message, `💼 **Déposer dans la team**\n\nUsage : \`${client.prefix}tdep <montant/all>\``);
    }

    try {
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });

      if (!player) {
        return simpleReply(message, `❌ **Erreur**\n\nVous n'avez pas d'argent.`);
      }

      const teamMember = await client.models.TeamMembers.findOne({
        where: { userId }
      });

      if (!teamMember) {
        return simpleReply(message, `❌ **Erreur**\n\nVous n'appartenez à aucune team.`);
      }

      const team = await client.models.Teams.findOne({
        where: { id: teamMember.teamId, guildId }
      });

      if (!team) {
        return simpleReply(message, `❌ **Erreur**\n\nVotre team est introuvable.`);
      }

      let depositAmount = 0;
      const playerCoins = player.coins || 0;

      if (args[0].toLowerCase() === 'all') {
        depositAmount = playerCoins;
      } else {
        depositAmount = parseInt(args[0]);
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return simpleReply(message, `❗ **Montant invalide**\n\nVeuillez spécifier un montant valide ou \`all\`.`);
        }
        if (depositAmount > playerCoins) {
          return simpleReply(message, playerCoins === 0
            ? `💸 **Rupture de stock**\n\nVous n'avez pas d'argent disponible.`
            : `💸 **Montant trop élevé**\n\nVous n'avez que \`${playerCoins}\` ${client.coins} disponible.`);
        }
      }

      if (depositAmount === 0) {
        return simpleReply(message, `❌ **Rien à déposer**\n\nVous n'avez pas d'argent à déposer.`);
      }

      player.coins -= depositAmount;
      team.balance = (team.balance || 0) + depositAmount;
      await player.save();
      await team.save();

      return simpleReply(message, `🏦 **Dépôt effectué**\n\nVous avez déposé \`${depositAmount}\` ${client.coins} dans la team.`);
    } catch (error) {
      console.error("Erreur dans la commande tdep:", error);
      return simpleReply(message, `⚠️ **Erreur inconnue**\n\nImpossible de déposer l'argent pour votre team.`);
    }
  }
};
