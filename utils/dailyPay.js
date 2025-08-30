const { metierLegal, metierIllegal } = require('../commands/metiers/metierData');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const cron = require('node-cron');

// webhook pr la notif des payments quotidient mettez le sur un autre serv cmieux

const webhookUrl = 'https://discord.com/api/webhooks/1367533340223082578/PMiOJ2cba2P4rxT-3s3wx1UI-olINlkAQOLhWUV4pByWnpjCIqcKeYsyP01cJSzKakFe';
const webhook = new WebhookClient({ url: webhookUrl });

module.exports = (client) => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Paiement] Lancement du paiement quotidien 00h00');

    try {
      const allPlayers = await client.models.Players.findAll();

      const players = allPlayers.filter(p => p.legalJob || p.illegalJob);

      console.log(`[Paiement] ${players.length} joueurs à traiter`);

      let totalPayments = 0;
      let totalPlayers = 0;
      let totalLegalPayments = 0;
      let totalIllegalPayments = 0;
      const paymentDetails = [];

      for (const player of players) {
        let totalPlayerPayment = 0;
        const playerPayments = [];

        if (player.legalJob && metierLegal[player.legalJob]) {
          const metier = metierLegal[player.legalJob];
          const salaireNet = Math.floor(metier.salaire * (1 - metier.impot));
          player.money += salaireNet;
          player.legalJobEarnings = (player.legalJobEarnings || 0) + salaireNet;
          totalLegalPayments += salaireNet;
          totalPlayerPayment += salaireNet;
          playerPayments.push(`💼 **${metier.nom}**: ${salaireNet} coins`);
        }

        if (player.illegalJob && metierIllegal[player.illegalJob]) {
          const metier = metierIllegal[player.illegalJob];
          const salaireNet = Math.floor(metier.salaire * (1 - metier.impot));
          player.money += salaireNet;
          player.illegalJobEarnings = (player.illegalJobEarnings || 0) + salaireNet;
          totalIllegalPayments += salaireNet;
          totalPlayerPayment += salaireNet;
          playerPayments.push(`🕵️ **${metier.nom}**: ${salaireNet} coins`);
        }

        if (totalPlayerPayment > 0) {
          await player.save();
          totalPayments += totalPlayerPayment;
          totalPlayers++;

          paymentDetails.push({
            userId: player.userId,
            username: (await client.users.fetch(player.userId).catch(() => null))?.username || 'Utilisateur inconnu',
            total: totalPlayerPayment,
            details: playerPayments
          });

        }
      }

      const adminEmbed = new EmbedBuilder()
        .setColor('#0984e3')
        .setTitle('📊 Récapitulatif des paiements quotidiens')
        .addFields(
          { name: 'Joueurs payés', value: `${totalPlayers}`, inline: true },
          { name: 'Total versé', value: `${totalPayments} coins`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Métiers légaux', value: `${totalLegalPayments} coins`, inline: true },
          { name: 'Métiers illégaux', value: `${totalIllegalPayments} coins`, inline: true }
        )
        .setTimestamp();

      await webhook.send({ embeds: [adminEmbed] });

      if (paymentDetails.length > 0) {
        const chunks = [];
        let currentChunk = "";

        for (const payment of paymentDetails) {
          const entry = `**${payment.username}**: ${payment.total} coins (${payment.details.join(', ')})\n`;

          if (currentChunk.length + entry.length > 1900) {
            chunks.push(currentChunk);
            currentChunk = entry;
          } else {
            currentChunk += entry;
          }
        }

        if (currentChunk.length > 0) chunks.push(currentChunk);
      }

      console.log(`[Paiement] Paiement terminé : ${totalPlayers} joueurs, ${totalPayments} coins distribués`);

    } catch (error) {
      console.error(`[Paiement] Erreur : ${error.message}`);

      await webhook.send({
        content: `⚠️ **ERREUR DANS LE SYSTÈME DE PAIEMENT**\n\`\`\`${error.message}\`\`\``
      }).catch(() => {});
    }
  }, {
    scheduled: true,
    timezone: "Europe/Paris"
  });

  console.log('[Paiement] Système de paiement quotidien initialisé (18h15)');
};
