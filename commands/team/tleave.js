const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'tleave',
  description: "Quitter votre team.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const teamMember = await client.models.TeamMembers.findOne({
        where: { userId: userId }
      });

      if (!teamMember) {
        return simpleReply(message, `Vous n'appartenez à aucune team.`);
      }

      if (teamMember.role === 'owner') {
        return simpleReply(message, `Vous êtes owner de votre team. Vous devez transférer la propriété avant de pouvoir quitter.`);
      }

      await teamMember.destroy();

      return simpleReply(message, `Vous avez quitté votre team avec succès.`);
    } catch (error) {
      console.error("Erreur dans la commande tleave:", error);
      return simpleReply(message, "Une erreur est survenue lors de votre départ de la team.");
    }
  }
};
