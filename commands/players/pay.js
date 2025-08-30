const simpleReply = require('../../utils/simpleReply');
const resolveMember = require('../../utils/resolveMember');

module.exports = {
  name: 'pay',
  description: "Transférer de l'argent à un autre joueur",
  usage: "{user} {montant}",
  async execute(message, args, client) {
    if (!message.guild) return;


    const TAX_RATE = 5; 
    
    const userId = message.author.id;
    const guildId = message.guild.id;

    try {

      if (!args[0] || !args[1]) {
        return simpleReply(message, `❓ **Syntaxe invalide**\n\nUsage: \`${client.prefix}pay <@utilisateur> <montant>\``);
      }


      const targetMember = await resolveMember(message, [args[0]]);
      if (!targetMember) {
        return simpleReply(message, `❌ **Erreur**\n\nUtilisateur introuvable.`);
      }

      if (targetMember.id === message.author.id) {
        return simpleReply(message, `🙃 **Action impossible**\n\nVous ne pouvez pas vous payer vous-même.`);
      }

      if (targetMember.bot) {
        return simpleReply(message, `🤖 **Cible invalide**\n\nVous ne pouvez pas payer un bot.`);
      }

      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) {
        return simpleReply(message, `❌ **Erreur**\n\nVeuillez spécifier un montant valide (nombre positif).`);
      }

      const coin = client.coins;

      const [sender] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: {
          coins: 0,
          lastGift: null,
          banque: 0,
          dette: 0
        }
      });

      if (sender.coins < amount) {
        return simpleReply(message, `💸 **Fonds insuffisants**\n\nVous n'avez pas assez de pièces. Solde actuel : \`${sender.coins.toLocaleString('fr-FR')}\` ${coin}`);
      }


      const taxAmount = Math.floor(amount * (TAX_RATE / 100));
      const transferAmount = amount - taxAmount;


      const [receiver] = await client.models.Players.findOrCreate({
        where: { 
          userId: targetMember.id, 
          guildId 
        },
        defaults: {
          coins: 0,
          lastGift: null,
          banque: 0,
          dette: 0
        }
      });

      sender.coins -= amount;
      await sender.save();

      receiver.coins += transferAmount;
      await receiver.save();

      const formattedAmount = amount.toLocaleString('fr-FR');
      const formattedTransferAmount = transferAmount.toLocaleString('fr-FR');
      const formattedTaxAmount = taxAmount.toLocaleString('fr-FR');

      return simpleReply(message, 
        `✅ **Transaction réussie**\n\n` +
        `Vous avez envoyé \`${formattedTransferAmount}\` ${coin} à ${targetMember.username}\n` +
        `Taxe prélevée : \`${formattedTaxAmount}\` ${coin} (${TAX_RATE}%)\n` +
        `Montant total débité : \`${formattedAmount}\` ${coin}`
      );


    } catch (error) {
      console.error("Erreur dans la commande pay:", error);
      return simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite lors du traitement de votre paiement.`);
    }
  }
};