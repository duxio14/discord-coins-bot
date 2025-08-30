const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'wh',
  usage: "<montant>",
  description: "Récuperer de l'argent de la banque.",
  dette: true,
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    
    if (!args[0]) {
      return simpleReply(message, `📤 **Retrait d'argent**\n\nUsage : \`${client.prefix}wh <montant|all>\``);
    }

    try {
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });

      if (!player) {
        return simpleReply(message, `❌ **Erreur**\n\nVous n'avez pas de compte actif.`);
      }

      let amount = 0;
      const bank = player.banque || 0;

      if (args[0].toLowerCase() === 'all') {
        amount = bank;
      } else {
        amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
          return simpleReply(message, `❌ **Montant invalide**\n\nVeuillez spécifier un montant valide ou \`all\`.`);
        }

        if (amount > bank) {
          return simpleReply(message, bank === 0 
            ? `❌ **Fonds insuffisants**\n\nVous n'avez rien à retirer.` 
            : `❌ **Fonds insuffisants**\n\nVous n'avez que \`${bank.toLocaleString('fr-FR')}\` ${client.coins} en banque.`);
        }
      }

      if (amount === 0) {
        return simpleReply(message, `❌ **Retrait impossible**\n\nVous n'avez pas d'argent à retirer.`);
      }

      player.banque -= amount;
      player.coins = (player.coins || 0) + amount;
      await player.save();

      return simpleReply(message, `📤 **Retrait effectué**\n\nVous avez retiré \`${amount.toLocaleString('fr-FR')}\` ${client.coins} de votre compte en banque.`);
    } catch (error) {
      console.error("Erreur dans la commande wh:", error);
      return simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite lors du retrait.`);
    }
  }
};
