const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'add',
  description: "Ajoute des coins à un utilisateur",
  wlOnly: true,
  async execute(message, args, client) {

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    const amount = parseInt(args[1], 10);

    if (!user || isNaN(amount) || amount <= 0) {
      return simpleReply(message, `❌ **Utilisation incorrecte**\n\nFormat : \`.add <@membre|ID> <montant positif>\``);
    }

    const target = await client.models.Players.findOne({ where: { userId: user.id, guildId: message.guild.id } });

    if (!target) {
      return simpleReply(message, `❌ **Erreur**\n\nCe joueur n'a pas encore de profil.`);
    }

    target.coins += amount;
    await target.save();

    simpleReply(message, `✅ **Ajout effectué**\n\n\`${amount.toLocaleString('fr-FR')}\` ${client.coins} ont été ajoutés à ${user.username}.`);
  }
};
