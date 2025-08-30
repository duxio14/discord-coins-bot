const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'tdelete',
  description: "Supprimer une team.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const teamMember = await client.models.TeamMembers.findOne({ where: { userId } });

      if (!teamMember) {
        return simpleReply(message, `❌ Vous n'appartenez à aucune équipe.`);
      }

      if (teamMember.role !== 'owner') {
        return simpleReply(message, `❌ Seul le propriétaire de l'équipe peut la supprimer.`);
      }

      const team = await client.models.Teams.findOne({
        where: { id: teamMember.teamId, guildId }
      });

      if (!team) {
        return simpleReply(message, `❌ Équipe introuvable.`);
      }

      const teamName = team.name;

      await client.models.TeamMembers.destroy({ where: { teamId: team.id } });

      await team.destroy();

      return simpleReply(message, `🗑️ L'équipe \`${teamName}\` a bien été supprimée.`);
    } catch (error) {
      console.error("Erreur dans la commande tdelete :", error);
      return simpleReply(message, `❌ Une erreur est survenue lors de la suppression de l'équipe.`);
    }
  }
};
