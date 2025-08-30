const simpleReply = require('../../utils/simpleReply');
const resolveMember = require("../../utils/resolveMember");
const applyBankInterest = require('../../utils/interest');

module.exports = {
  name: 'bal',
  aliases: ["balance"],
  usage: "{user}",
  description: "Affiche votre balance",
  async execute(message, args, client) {
    if (!message.guild) return;

    const member = await resolveMember(message, args);
    const guildId = message.guild.id;

    const player = await client.models.Players.findOne({
      where: {
        userId: member.id,
        guildId: guildId
      }
    });

    const { gained, periods } = await applyBankInterest(client, message.author.id);


    const cryptoWallet = await client.models.CryptoWallet.findOne({
      where: {
        userId: member.id,
        guildId: guildId
      }
    });

    const cryptoMarket = await client.models.CryptoMarket.findOne({
      where: { guildId: guildId }
    });

    const coin = client.coins;
    const coins = player?.coins || 0;
    const banque = player?.banque || 0;

    const hasCrypto = cryptoWallet && cryptoWallet.amount > 0 && cryptoMarket;
    const cryptoAmount = hasCrypto ? cryptoWallet.amount.toFixed(4) : null;
    const cryptoValue = hasCrypto ? Math.round(cryptoWallet.amount * cryptoMarket.currentPrice).toLocaleString('fr-FR') : null;

    let cryptoText = '';
    if (hasCrypto) {
      cryptoText = `\nSteelCoin : \`${cryptoAmount} STC\` (~${cryptoValue} ${coin})`;
    }

    simpleReply(
      message,
      `**Solde de ${member.tag}**\n\nEn poche : \`${coins.toLocaleString('fr-FR')}\` ${coin}\nEn banque : \`${(banque + gained).toLocaleString('fr-FR')}\` ${coin}${cryptoText}`
    );
  }
};
