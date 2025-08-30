const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'remove',
  description: "Retire des coins à un utilisateur (portefeuille + banque)",
  wlOnly: true,
  async execute(message, args, client) {
    if (!message.member.permissions.has('Administrator')) {
      return simpleReply(message, `❌ **Permission refusée**\n\nSeuls les administrateurs peuvent utiliser cette commande.`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    const amount = parseInt(args[1], 10);

    if (!user || isNaN(amount) || amount <= 0) {
      return simpleReply(message, `❌ **Utilisation incorrecte**\n\nFormat : \`.remove <@membre|ID> <montant positif>\``);
    }

    const target = await client.models.Players.findOne({ where: { userId: user.id, guildId: message.guild.id } });

    if (!target) {
      return simpleReply(message, `❌ **Erreur**\n\nCe joueur n'a pas encore de profil.`);
    }

    const totalPossession = (target.coins || 0) + (target.banque || 0);
    const amountToRemove = Math.min(amount, totalPossession); 

    let fromWallet = Math.min(amountToRemove, target.coins);
    let fromBank = amountToRemove - fromWallet;

    target.coins -= fromWallet;
    target.banque -= fromBank;

    await target.save();

    simpleReply(message, `✅ **Retrait effectué**\n\n\`${amountToRemove.toLocaleString('fr-FR')}\` ${client.coins} ont été retirés à ${user.username} (\`${fromWallet.toLocaleString('fr-FR')}\` du portefeuille, \`${fromBank.toLocaleString('fr-FR')}\` de la banque).`);
  }
};
