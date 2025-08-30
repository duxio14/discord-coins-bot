const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'reset',
  description: "Réinitialise le solde d'un utilisateur à 0",
  wlOnly: true,
  async execute(message, args, client) {
   

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);

    if (!user) {
      return simpleReply(message, `❌ **Utilisation incorrecte**\n\nFormat : \`.reset <@membre|ID>\``);
    }

    const target = await client.models.Players.findOne({ where: { userId: user.id, guildId: message.guild.id } });

    if (!target) {
      return simpleReply(message, `❌ **Erreur**\n\nCe joueur n'a pas encore de profil.`);
    }

    target.coins = 0;
    target.banque = 0;
    await target.save();

    simpleReply(message, `♻️ **Solde réinitialisé**\n\nLe solde de ${user.username} a été remis à \`0\` ${client.coins}.`);
  }
};
