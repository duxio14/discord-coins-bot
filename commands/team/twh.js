const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'twh',
  usage: "<montant>",
  description: "Prendre de l'argent de la banque de votre team.",
  dette: true,
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!args[0]) {
      return simpleReply(message, `❌ Utilisation : \`${client.prefix}twh <montant|all> [motdepasse]\``);
    }

    try {
      const player = await client.models.Players.findOne({ where: { userId, guildId } });
      if (!player) return simpleReply(message, `❌ Vous n'avez pas de compte.`);

      const teamMember = await client.models.TeamMembers.findOne({ where: { userId } });
      if (!teamMember) return simpleReply(message, `❌ Vous n'appartenez à aucune équipe.`);
      if (!["owner", "staff"].includes(teamMember.role)) {
        return simpleReply(message, `❌ Seuls les owners ou staffs peuvent retirer de l'argent de la team.`);
      }

      const team = await client.models.Teams.findOne({ where: { id: teamMember.teamId, guildId } });
      if (!team) return simpleReply(message, `❌ Équipe introuvable.`);

      const teamCoins = team.balance || 0;
      let withdrawAmount = 0;

      if (args[0].toLowerCase() === 'all') {
        withdrawAmount = teamCoins;
      } else {
        withdrawAmount = parseInt(args[0]);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return simpleReply(message, `❌ Veuillez spécifier un montant valide ou \`all\`.`);
        }
        if (withdrawAmount > teamCoins) {
          return simpleReply(message, teamCoins === 0
            ? `❌ La team n'a pas d'argent disponible.`
            : `❌ La team n'a que \`${teamCoins}\` ${client.coins} disponible.`);
        }
      }

      const PASSWORD_REQUIRED_LIMIT = 100_000; 
      const password = args[1];

      if (withdrawAmount >= PASSWORD_REQUIRED_LIMIT) {
        if (!password) {
          return simpleReply(message, `🔒 Un mot de passe est requis pour retirer plus de \`${PASSWORD_REQUIRED_LIMIT}\` ${client.coins}.`);
        }

        const correctPassword = client.config.teamPassword;
        if (password !== correctPassword) {
          return simpleReply(message, `❌ Mot de passe incorrect.`);
        }
      }

      if (withdrawAmount === 0) {
        return simpleReply(message, `❌ Il n'y a rien à retirer.`);
      }

      team.balance -= withdrawAmount;
      player.coins = (player.coins || 0) + withdrawAmount;

      await team.save();
      await player.save();

      return simpleReply(message, `✅ Vous avez retiré \`${withdrawAmount}\` ${client.coins} de la team.`);
    } catch (error) {
      console.error("Erreur dans la commande twh:", error);
      return simpleReply(message, `❌ Une erreur est survenue lors du retrait.`);
    }
  }
};
