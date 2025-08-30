const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SelectMenuBuilder } = require('discord.js');
const Canvas = require('canvas');
const { metierLegal, metierIllegal } = require('./metierData');
const simpleReply = require('../../utils/simpleReply');
const path = require('path');
Canvas.registerFont(path.join(__dirname, '../../assets/fonts/Montserrat-Bold.ttf'), { family: 'Roboto', weight: 'bold' });
Canvas.registerFont(path.join(__dirname, '../../assets/fonts/Montserrat-Regular.ttf'), { family: 'Roboto', weight: 'normal' });

module.exports = {
  name: 'job',
  description: "Informations sur votre/vos métier(s)",
  dette: true,
  async execute(message, args, client) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const player = await client.models.Players.findOne({ where: { userId, guildId } });

      if (!player) {
        return simpleReply(message, "💼 Vous n'êtes pas enregistré dans la base de données.");
      }
      const hasLegalJob = player.legalJob ? true : false;
      const hasIllegalJob = player.illegalJob ? true : false;
      if (args && args.length > 0 && args[0].toLowerCase() === "leave") {
        return handleJobLeave(message, args, client, player, hasLegalJob, hasIllegalJob);
      }
      if (!hasLegalJob && !hasIllegalJob) {
        return simpleReply(message, "💼 Vous n'avez actuellement aucun métier.");
      }
      let primaryJobType = "legal"; // Default to legal job
      if (args && args.length > 0) {
        const requestedType = args[0].toLowerCase();

        if (requestedType === "illegal" || requestedType === "illégal") {
          if (hasIllegalJob) {
            primaryJobType = "illegal";
          } else {
            return simpleReply(message, "💼 Vous n'avez pas de métier illégal.");
          }
        } else if (requestedType === "legal" || requestedType === "légal") {
          if (hasLegalJob) {
            primaryJobType = "legal";
          } else {
            return simpleReply(message, "💼 Vous n'avez pas de métier légal.");
          }
        }
      } else {
        if (!hasLegalJob && hasIllegalJob) {
          primaryJobType = "illegal";
        }
      }
      const primaryJobId = primaryJobType === "legal" ? player.legalJob : player.illegalJob;
      const primaryJobSince = primaryJobType === "legal" ? player.legalJobSince : player.illegalJobSince;
      const primaryJobEarnings = primaryJobType === "legal" ? player.legalJobEarnings : player.illegalJobEarnings;
      const primaryJobData = primaryJobType === "legal" ? metierLegal : metierIllegal;
      const primaryMetier = primaryJobData[primaryJobId];

      if (!primaryMetier) {
        return simpleReply(message, "⚠️ Métier introuvable dans la base de données.");
      }
      const jobSinceDate = primaryJobSince ? new Date(primaryJobSince) : new Date();
      const now = new Date();
      const durationDays = Math.floor((now - jobSinceDate) / (1000 * 60 * 60 * 24));
      const canvas = Canvas.createCanvas(800, hasIllegalJob && hasLegalJob ? 550 : 450);
      const ctx = canvas.getContext('2d');
      const primaryColor = primaryJobType === "legal" ? '#00cec9' : '#e84393';
      const bgColor = '#1e272e';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#485460';
      ctx.fillRect(0, 0, canvas.width, 70);
      ctx.font = 'bold 36px Roboto';
      ctx.fillStyle = primaryColor;
      ctx.textAlign = 'center';
      const jobTitle = '🧾 Profil de carrière';
      ctx.fillText(jobTitle, canvas.width / 2, 45);
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      ctx.arc(100, 150, 60, 0, Math.PI * 2);
      ctx.fill();
      const jobIcon = primaryJobType === "legal" ? '💼' : '🕵️';
      ctx.font = '64px Roboto';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText(jobIcon, 100, 160);
      ctx.textAlign = 'left';
      ctx.font = 'bold 28px Roboto';
      ctx.fillStyle = 'white';
      ctx.fillText(`${message.author.username}`, 200, 120);
      ctx.font = 'bold 26px Roboto';
      ctx.fillStyle = primaryColor;
      ctx.fillText(`${primaryMetier.nom}`, 200, 160);
      ctx.font = 'bold 22px Roboto';
      ctx.fillStyle = primaryColor;
      ctx.fillText(`Métier ${primaryJobType === "legal" ? "légal" : "illégal"}`, 200, 200);
      ctx.fillStyle = '#2f3640';
      ctx.fillRect(40, 220, canvas.width - 80, 180);
      ctx.font = '22px Roboto';
      ctx.fillStyle = 'white';
      ctx.fillText('📅 Durée d\'emploi :', 70, 260);
      ctx.fillText('💰 Salaire net par jour :', 70, 310);
      ctx.fillText('📈 Total gagné :', 70, 360);

      ctx.fillStyle = '#fab1a0';
      ctx.fillText(`${durationDays} jour(s)`, 350, 260);

      ctx.fillStyle = '#55efc4';
      const salaireNet = primaryMetier.salaire * (1 - primaryMetier.impot);
      ctx.fillText(`${Math.floor(salaireNet)} coins`, 350, 310);

      ctx.fillStyle = '#ffeaa7';
      ctx.fillText(`${primaryJobEarnings || 0} coins`, 350, 360);
      const showSecondaryJob = !args.length && hasLegalJob && hasIllegalJob;

      if (showSecondaryJob) {
        const secondaryJobType = primaryJobType === "legal" ? "illegal" : "legal";
        const secondaryJobId = secondaryJobType === "legal" ? player.legalJob : player.illegalJob;
        const secondaryJobData = secondaryJobType === "legal" ? metierLegal : metierIllegal;
        const secondaryMetier = secondaryJobData[secondaryJobId];
        const secondaryColor = secondaryJobType === "legal" ? '#00cec9' : '#e84393';
        ctx.font = 'bold 22px Roboto';
        ctx.fillStyle = secondaryColor;
        ctx.fillText(`Métier ${secondaryJobType === "legal" ? "légal" : "illégal"}`, 40, 430);
        ctx.fillStyle = '#2f3640';
        ctx.fillRect(40, 440, canvas.width - 80, 80);
        const secondaryJobIcon = secondaryJobType === "legal" ? '💼' : '🕵️';
        ctx.font = '28px Roboto';
        ctx.fillStyle = 'white';
        ctx.fillText(secondaryJobIcon, 70, 485);

        ctx.font = 'bold 20px Roboto';
        ctx.fillStyle = secondaryColor;
        ctx.fillText(secondaryMetier.nom, 110, 485);
        const secondarySalaireNet = secondaryMetier.salaire * (1 - secondaryMetier.impot);
        ctx.font = '18px Roboto';
        ctx.fillStyle = 'white';
        ctx.fillText(`Salaire: ${Math.floor(secondarySalaireNet)} coins/jour`, 110, 510);
        ctx.font = '16px Roboto';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'right';
        ctx.fillText(`Tapez ".job ${secondaryJobType}" pour plus de détails`, canvas.width - 60, 510);
      }
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'job-profile.png' });
      await message.reply({
        files: [attachment]
      });

    } catch (err) {
      console.error("Erreur dans la commande .job :", err);
      return simpleReply(message, "❌ Une erreur est survenue.");
    }
  },
};
async function handleJobLeave(message, args, client, player, hasLegalJob, hasIllegalJob) {
  if (!hasLegalJob && !hasIllegalJob) {
    return simpleReply(message, "💼 Vous n'avez aucun métier à quitter.");
  }
  if (hasLegalJob && hasIllegalJob) {
    if (args.length > 1) {
      const jobTypeToLeave = args[1].toLowerCase();
      if (jobTypeToLeave === "legal" || jobTypeToLeave === "légal") {
        return handleSpecificJobLeave(message, client, player, "legal");
      } else if (jobTypeToLeave === "illegal" || jobTypeToLeave === "illégal") {
        return handleSpecificJobLeave(message, client, player, "illegal");
      } else {
        return simpleReply(message, "❌ Type de métier invalide. Utilisez 'legal' ou 'illegal'.");
      }
    }
    const row = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId('select_job_to_leave')
        .setPlaceholder('Choisissez le métier à quitter')
        .addOptions([
          {
            label: 'Métier légal',
            description: 'Quitter votre métier légal',
            value: 'legal',
            emoji: '💼'
          },
          {
            label: 'Métier illégal',
            description: 'Quitter votre métier illégal',
            value: 'illegal',
            emoji: '🕵️'
          }
        ])
    );

    const response = await message.reply({
      content: "🧾 Quel métier souhaitez-vous quitter?",
      components: [row]
    });
    try {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.SelectMenu,
        time: 30000,
        max: 1
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "❌ Vous ne pouvez pas interagir avec ce menu.",
            ephemeral: true
          });
        }

        const selectedJobType = interaction.values[0];
        await interaction.update({
          components: [] 
        });
        await handleSpecificJobLeave(message, client, player, selectedJobType);
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          await response.edit({
            content: "⏱️ Temps écoulé. Opération annulée.",
            components: []
          });
        }
      });
    } catch (error) {
      console.error("Erreur lors de la collection d'interactions:", error);
      return simpleReply(message, "❌ Une erreur est survenue.");
    }
  } else {
    const jobType = hasLegalJob ? "legal" : "illegal";
    return handleSpecificJobLeave(message, client, player, jobType);
  }
}
async function handleSpecificJobLeave(message, client, player, jobType) {
  try {
    const isLegalJob = jobType === "legal";
    const jobId = isLegalJob ? player.legalJob : player.illegalJob;
    const jobData = isLegalJob ? metierLegal : metierIllegal;
    const metier = jobData[jobId];

    if (!metier) {
      return simpleReply(message, `⚠️ Métier ${isLegalJob ? "légal" : "illégal"} introuvable dans la base de données.`);
    }
    const leavePrice = (metier.salaire / 10)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_leave')
        .setLabel(`Confirmer (${leavePrice} coins)`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_leave')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );
    const response = await message.reply({
      content: `⚠️ Êtes-vous sûr de vouloir quitter votre métier ${isLegalJob ? "légal" : "illégal"} (${metier.nom}) ? Cela vous coûtera **${leavePrice} coins**.`,
      components: [row]
    });
    try {
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        max: 1
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "❌ Vous ne pouvez pas interagir avec ces boutons.",
            ephemeral: true
          });
        }
        await interaction.update({
          components: []
        });

        if (interaction.customId === 'cancel_leave') {
          return interaction.editReply("✅ Opération annulée.");
        }
        if (player.balance < leavePrice) {
          return interaction.editReply(`❌ Vous n'avez pas assez d'argent pour quitter ce métier. Il vous faut ${leavePrice} coins.`);
        }
        player.balance -= leavePrice;
        if (isLegalJob) {
          player.legalJob = null;
          player.legalJobSince = null;
        } else {
          player.illegalJob = null;
          player.illegalJobSince = null;
        }
        await player.save();

        return interaction.editReply(`✅ Vous avez quitté votre métier ${isLegalJob ? "légal" : "illégal"} (${metier.nom}) et payé ${leavePrice} coins.`);
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          await response.edit({
            content: "⏱️ Temps écoulé. Opération annulée.",
            components: []
          });
        }
      });
    } catch (error) {
      console.error("Erreur lors de la collection d'interactions:", error);
      return simpleReply(message, "❌ Une erreur est survenue.");
    }
  } catch (error) {
    console.error("Erreur lors du traitement de démission:", error);
    return simpleReply(message, "❌ Une erreur est survenue.");
  }
}