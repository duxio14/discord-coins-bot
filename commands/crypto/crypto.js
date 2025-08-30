
const { MessageEmbed, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const moment = require('moment');
const Canvas = require('canvas');
const { description } = require('../admins/enchere');
require('moment/locale/fr');
moment.locale('fr');

module.exports = {
    name: 'crypto',
    usage: "buy/sell/historique <somme>",
    description: "Envoie les différentes options du marché crypto du serveur.",
    async execute(message, args, client) {
        if (!message.guild) return;

        const guildId = message.guild.id;
        const userId = message.author.id;

        let cryptoMarket = await client.models.CryptoMarket.findOne({
            where: { guildId: guildId }
        });

   
        if (!cryptoMarket) {
            cryptoMarket = await client.models.CryptoMarket.create({
                guildId: guildId,
                currentPrice: 100.0,
                lastUpdate: new Date(),
                historicalPrices: JSON.stringify([{
                    price: 100.0,
                    timestamp: new Date().toISOString()
                }])
            });
        }


        const lastUpdate = new Date(cryptoMarket.lastUpdate);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        if (lastUpdate < sixHoursAgo) {
            const historicalPrices = JSON.parse(cryptoMarket.historicalPrices);

  
            const volatility = 0.30; 
            const change = (Math.random() * 2 - 1) * volatility;
            const newPrice = Math.max(5, cryptoMarket.currentPrice * (1 + change));


            const roundedPrice = Math.round(newPrice * 100) / 100;


            historicalPrices.push({
                price: roundedPrice,
                timestamp: new Date().toISOString()
            });


            if (historicalPrices.length > 24) {
                historicalPrices.shift();
            }


            await cryptoMarket.update({
                currentPrice: roundedPrice,
                lastUpdate: new Date(),
                historicalPrices: JSON.stringify(historicalPrices)
            });

 
            cryptoMarket = await client.models.CryptoMarket.findOne({
                where: { guildId: guildId }
            });
        }

 
        let cryptoWallet = await client.models.CryptoWallet.findOne({
            where: { userId: userId, guildId: guildId }
        });

        if (!cryptoWallet) {
            cryptoWallet = await client.models.CryptoWallet.create({
                userId: userId,
                guildId: guildId
            });
        }

 
        const playerProfile = await client.models.Players.findOne({
            where: { userId: userId, guildId: guildId }
        });

        if (!playerProfile) {
            return simpleReply(message, "Vous n'avez pas encore de profil économique. Utilisez une commande comme `.daily` pour en créer un.");
        }


        const subCommand = args[0]?.toLowerCase();

        if (!subCommand || subCommand === 'info') {
     
            const historicalPrices = JSON.parse(cryptoMarket.historicalPrices);
            const priceChange = historicalPrices.length > 1
                ? ((cryptoMarket.currentPrice - historicalPrices[historicalPrices.length - 2].price) / historicalPrices[historicalPrices.length - 2].price) * 100
                : 0;

            const trend = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';
            const nextUpdate = new Date(cryptoMarket.lastUpdate.getTime() + 6 * 60 * 60 * 1000);
            const timeUntilUpdate = moment(nextUpdate).fromNow();

       
            const walletValue = Math.round(cryptoWallet.amount * cryptoMarket.currentPrice);
            const profitLoss = walletValue - cryptoWallet.totalInvested;
            const profitLossPercent = cryptoWallet.totalInvested > 0
                ? ((walletValue / cryptoWallet.totalInvested) - 1) * 100
                : 0;
            const walletImage = await generateWalletCanvas(message.author.username, cryptoWallet.amount, walletValue, cryptoMarket.currentPrice, profitLoss, profitLossPercent, trend, priceChange);
            const attachment = new AttachmentBuilder(walletImage, 'crypto_wallet.png');


            const embed = new EmbedBuilder()
  .setColor(0xf5b041)
  .setTitle('📊 Marché de Mizori')
  .setDescription(`Le **SteelCoin (STC)** est actuellement évalué à **${cryptoMarket.currentPrice.toLocaleString('fr-FR')} 💰**.\nTendance : ${trend} ${priceChange.toFixed(2)}%`)
  .addFields(
    {
      name: '📅 Prochaine mise à jour',
      value: `${timeUntilUpdate}`,
      inline: true
    },
    {
      name: '📈 Volatilité',
      value: '±30% / 6h',
      inline: true
    },
    {
      name: '👛 Portefeuille',
      value: `• ${cryptoWallet.amount.toFixed(4)} STC\n• Valeur : ${walletValue.toLocaleString('fr-FR')} 💰\n• Profit/Perte : ${profitLoss > 0 ? '+' : ''}${profitLoss.toLocaleString('fr-FR')} 💰 (${profitLossPercent.toFixed(2)}%)`,
      inline: false
    },
    {
      name: '🛠️ Commandes',
      value: '`.crypto acheter <montant>` — Acheter\n`.crypto vendre <montant | all>` — Vendre\n`.crypto historique` — Graphique des prix',
      inline: false
    }
  )
  .setImage('attachment://crypto_wallet.png')
  .setFooter({ text: '💡 Conseil : achetez bas, vendez haut. Le marché est imprévisible !' });


            return message.channel.send({ embeds: [embed], files: [attachment] });
        }
        else if (subCommand === 'acheter' || subCommand === 'buy') {

            const amount = parseInt(args[1]);

            if (!amount || isNaN(amount) || amount <= 0) {
                return simpleReply(message, "Veuillez spécifier un montant valide à investir en SteelCoins. Exemple: `.crypto acheter 1000`");
            }

            if (amount > playerProfile.coins) {
                return simpleReply(message, `Vous n'avez pas assez d'argent. Vous avez ${playerProfile.coins.toLocaleString('fr-FR')} 💰 mais vous essayez d'investir ${amount.toLocaleString('fr-FR')} 💰.`);
            }

            const coinsReceived = amount / cryptoMarket.currentPrice;

            await cryptoWallet.update({
                amount: cryptoWallet.amount + coinsReceived,
                totalInvested: cryptoWallet.totalInvested + amount,
                lastTransaction: new Date()
            });

            await playerProfile.update({
                coins: playerProfile.coins - amount
            });

            return simpleReply(message, `Achat réussi! Vous avez acheté **${coinsReceived.toFixed(4)} STC** pour **${amount.toLocaleString('fr-FR')} 💰**\nPrix unitaire: **${cryptoMarket.currentPrice.toLocaleString('fr-FR')} 💰**`);
        }
        else if (subCommand === 'vendre' || subCommand === 'sell') {

            let amountToSell = args[1];

            if (!amountToSell) {
                return simpleReply(message, "Veuillez spécifier un montant à vendre ou `all` pour tout vendre. Exemple: `.crypto vendre 0.5` ou `.crypto vendre all`");
            }

            let coinAmount;
            if (amountToSell.toLowerCase() === 'all' || amountToSell.toLowerCase() === 'tout') {
                coinAmount = cryptoWallet.amount;
            } else {
                coinAmount = parseFloat(amountToSell);
                if (isNaN(coinAmount) || coinAmount <= 0) {
                    return simpleReply(message, "Veuillez spécifier un montant valide de SteelCoins à vendre.");
                }
            }

            if (coinAmount > cryptoWallet.amount) {
                return simpleReply(message, `Vous n'avez pas assez de SteelCoins. Vous avez **${cryptoWallet.amount.toFixed(4)} STC** mais vous essayez d'en vendre **${coinAmount.toFixed(4)}**.`);
            }


            const earnings = Math.round(coinAmount * cryptoMarket.currentPrice);

            await cryptoWallet.update({
                amount: cryptoWallet.amount - coinAmount,
                lastTransaction: new Date()
            });

            await playerProfile.update({
                coins: playerProfile.coins + earnings
            });

            let profitLossMessage = '';
            if (amountToSell.toLowerCase() === 'all' || amountToSell.toLowerCase() === 'tout') {
                const invested = cryptoWallet.totalInvested;
                const profit = earnings - invested;
                const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;


                await cryptoWallet.update({
                    totalInvested: 0
                });

                profitLossMessage = `\nProfit/Perte: **${profit > 0 ? '+' : ''}${profit.toLocaleString('fr-FR')} 💰** (${profitPercent.toFixed(2)}%)`;
            }

            return simpleReply(message, `Vente réussie! Vous avez vendu **${coinAmount.toFixed(4)} STC** pour **${earnings.toLocaleString('fr-FR')} 💰**\nPrix unitaire: **${cryptoMarket.currentPrice.toLocaleString('fr-FR')} 💰**${profitLossMessage}`);
        }
        else if (subCommand === 'historique' || subCommand === 'history') {

            const historicalPrices = JSON.parse(cryptoMarket.historicalPrices);

            if (historicalPrices.length <= 1) {
                return simpleReply(message, "L'historique des prix n'est pas encore disponible. Revenez après la prochaine mise à jour du marché.");
            }

            let historyMessage = "**📊 Historique des prix SteelCoin (STC)**\n\n";

            const lastPrices = historicalPrices.slice(-10);

            lastPrices.forEach((entry, index) => {
                const date = new Date(entry.timestamp);
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

             
                let changeSymbol = '';
                if (index > 0) {
                    const prevPrice = lastPrices[index - 1].price;
                    const change = ((entry.price - prevPrice) / prevPrice) * 100;
                    changeSymbol = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                }

                historyMessage += `${formattedDate}: **${entry.price.toLocaleString('fr-FR')} 💰** ${changeSymbol}\n`;
            });

            return simpleReply(message, historyMessage);
        }
        else {
            return simpleReply(message, "Commande non reconnue. Utilisez `.crypto` pour voir les options disponibles.");
        }
    }
};

async function generateWalletCanvas(username, coinAmount, walletValue, currentPrice, profitLoss, profitLossPercent, trend, priceChange) {
    const canvas = Canvas.createCanvas(750, 400);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#1e2124');
    bgGradient.addColorStop(1, '#2c2f33');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#F5B041';
    ctx.textAlign = 'center';
    ctx.fillText('💎 Mizori Wallet', canvas.width / 2, 60);


    ctx.font = '20px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Portefeuille de ${username}`, canvas.width / 2, 95);


    ctx.beginPath();
    ctx.moveTo(40, 110);
    ctx.lineTo(canvas.width - 40, 110);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

  
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Solde : ${coinAmount.toFixed(4)} STC`, 50, 160);

    ctx.font = '22px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Valeur actuelle : ${walletValue.toLocaleString('fr-FR')} 💰`, 50, 200);
    ctx.fillText(`Prix unitaire : ${currentPrice.toLocaleString('fr-FR')} 💰 ${trend}`, 50, 240);

    ctx.fillStyle = priceChange >= 0 ? '#43b581' : '#f04747';
    ctx.fillText(`Variation : ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`, 50, 280);

    if (profitLoss !== 0) {
        ctx.fillText(`Profit/Perte : ${profitLoss > 0 ? '+' : ''}${profitLoss.toLocaleString('fr-FR')} 💰 (${profitLossPercent.toFixed(2)}%)`, 50, 320);
    }


    const circleX = canvas.width - 150;
    const circleY = 200;
    const radius = 80;

    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.fillStyle = priceChange >= 0 ? '#2ecc71' : '#e74c3c';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(trend, circleX, circleY - 10);

    ctx.font = '20px Arial';
    ctx.fillText(`${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`, circleX, circleY + 25);

    return canvas.toBuffer();
}
