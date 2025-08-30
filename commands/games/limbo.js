const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

const { registerFont } = require('canvas');
registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
  family: 'Inter 24pt',
  weight: 'Bold'
});

async function generateLingoResultImage({ username, bet, target, actual, win, newBalance }) {

  const WIDTH = 1320;
  const HEIGHT = 800;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const winColor = win >= 0 ? '#2ecc71' : '#e74c3c';

  try {
    const bg = await loadImage(path.resolve(__dirname, '../../assets/limbo/limbo.png'));
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  } catch (error) {
    console.error("Erreur lors du chargement de l'image de fond:", error);

    ctx.fillStyle = '#151f2e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }


  ctx.font = 'bold 26px "Inter 24pt"';

  ctx.fillStyle = '#ffffff';

  ctx.font = 'bold 26px "Inter 24pt"';

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(`${bet}`, 40, 187);

  ctx.fillText(`X${target.toFixed(2)}`, 40, 294);
  ctx.fillText(`${username}`, 40, 95);

  ctx.textAlign = 'center';

  const centerX = WIDTH - 450;
  const centerY = HEIGHT / 2;

  ctx.save();
  ctx.shadowColor = winColor;
  ctx.shadowBlur = 25;
  ctx.font = 'bold 120px "Inter 24pt"';

  ctx.fillStyle = winColor;
  ctx.fillText(`x${actual.toFixed(2)}`, centerX, centerY);
  ctx.restore();

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'lingo-result.png' });
}

function createGameButtons(userId, betAmount, targetMultiplier) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`limbo_replay_${userId}_${betAmount}_${targetMultiplier}`)
        .setLabel('📌 Rejouer')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`limbo_change_${userId}`)
        .setLabel('⚙️ Changer les paramètres')
        .setStyle(ButtonStyle.Primary)
    );

  return row;
}

function createChangeParamsModal(userId) {
  const modal = new ModalBuilder()
    .setCustomId(`limbo_modal_${userId}`)
    .setTitle('Paramètres du Limbo');

  const betInput = new TextInputBuilder()
    .setCustomId('betInput')
    .setLabel('Mise (en coins)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Entrez votre mise')
    .setRequired(true);

  const multiplierInput = new TextInputBuilder()
    .setCustomId('multiplierInput')
    .setLabel('Multiplicateur cible (entre 1.01 et 150)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Entrez le multiplicateur cible')
    .setRequired(true);

  const firstRow = new ActionRowBuilder().addComponents(betInput);
  const secondRow = new ActionRowBuilder().addComponents(multiplierInput);

  modal.addComponents(firstRow, secondRow);

  return modal;
}

async function playLimboGame(interaction, betAmount, targetMultiplier, isReplay = false) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const client = interaction.client;

  try {

    const [player] = await client.models.Players.findOrCreate({
      where: { userId, guildId },
      defaults: { coins: 0, banque: 0 }
    });

    if (isNaN(betAmount) || betAmount <= 0) {
      const replyOptions = { content: "❌ Veuillez entrer une mise valide.", ephemeral: true };
      return isReplay ? interaction.editReply(replyOptions) : interaction.reply(replyOptions);
    }

    if (isNaN(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 150) {
      const replyOptions = { content: "❌ Veuillez entrer un multiplicateur entre 1.01 et 150.", ephemeral: true };
      return isReplay ? interaction.editReply(replyOptions) : interaction.reply(replyOptions);
    }

    if (player.coins < betAmount) {
      const replyOptions = { content: `❌ Vous n'avez pas assez de coins. Solde: \`${player.coins}\` 💰`, ephemeral: true };
      return isReplay ? interaction.editReply(replyOptions) : interaction.reply(replyOptions);
    }

    const actualMultiplier = getMultiplier(1.01, 150);

    let netResult;

    if (actualMultiplier >= targetMultiplier) {

      const winnings = Math.floor(betAmount * targetMultiplier);
      netResult = winnings - betAmount;
      await player.update({ coins: player.coins + netResult });
    } else {

      netResult = -betAmount;
      await player.update({ coins: player.coins - betAmount });
    }

    const image = await generateLingoResultImage({
      username: interaction.user.username,
      bet: betAmount,
      target: targetMultiplier,
      actual: actualMultiplier,
      win: netResult,
      newBalance: player.coins
    });

    const buttons = createGameButtons(userId, betAmount, targetMultiplier);

    const replyOptions = { files: [image], components: [buttons] };

    if (isReplay) {
      return await interaction.editReply(replyOptions);
    } else if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(replyOptions);
    } else {
      return await interaction.reply(replyOptions);
    }

  } catch (error) {
    console.error("Erreur dans le jeu limbo:", error);
    const errorOptions = { content: "❌ Une erreur est survenue pendant le jeu.", ephemeral: true };
    return isReplay ? interaction.editReply(errorOptions) : interaction.reply(errorOptions);
  }
}

module.exports = {
  name: 'limbo',
  usage: "<mise> [multiplicateur]",
  description: 'Joue au limbo avec un multiplicateur choisi',
  rules: `🌀 **Limbo – Visez le bon multiplicateur !**\n\nEntrez un multiplicateur cible (ex : \`2.00x\`) et lancez la partie.\n\n- 🎯 Si le multiplicateur s'arrête **au-dessus ou égal** à votre cible, vous remportez vos gains.\n- ❌ Sinon, vous perdez votre mise.\n\nPlus votre cible est haute, plus le risque est grand... mais la **récompense aussi** !\n\nJusqu'où irez-vous avant le crash ? ⚡`,

  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {

      const [player] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: { coins: 0, banque: 0 }
      });
      let betAmount;
      if (args[0] === "all") {
        betAmount = player.coins
      } else {
        betAmount = parseInt(args[0]);
      }

      const targetMultiplier = parseFloat(args[1]);

      if (isNaN(betAmount) || betAmount <= 0) {
        return simpleReply(message, "❌ Veuillez entrer une mise valide (ex: `.limbo 100 2.5`).");
      }

      if (isNaN(targetMultiplier) || targetMultiplier < 1.01 || targetMultiplier > 150) {
        return simpleReply(message, "❌ Veuillez entrer un multiplicateur entre 1.01 et 150.");
      }

      if (player.coins < betAmount) {
        return simpleReply(message, `❌ Vous n'avez pas assez de coins. Solde: \`${player.coins}\` 💰`);
      }

      const actualMultiplier = getMultiplier(1.01, 150);

      let netResult;

      if (actualMultiplier >= targetMultiplier) {

        const winnings = Math.floor(betAmount * targetMultiplier);
        netResult = winnings - betAmount;
        await player.update({ coins: player.coins + netResult });
      } else {

        netResult = -betAmount;
        await player.update({ coins: player.coins - betAmount });
      }

      const image = await generateLingoResultImage({
        username: message.author.username,
        bet: betAmount,
        target: targetMultiplier,
        actual: actualMultiplier,
        win: netResult,
        newBalance: player.coins
      });

      const buttons = createGameButtons(userId, betAmount, targetMultiplier);

      const sentMessage = await message.channel.send({ files: [image], components: [buttons] });


      if (!client.limboMessages) client.limboMessages = new Map();
      client.limboMessages.set(userId, sentMessage);

    } catch (error) {
      console.error("Erreur dans la commande limbo:", error);
      return simpleReply(message, "❌ Une erreur est survenue pendant le jeu.");
    }
  },

  async handleInteraction(interaction, client) {

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('limbo_replay_')) {
        const [_, __, userId, betAmount, targetMultiplier] = customId.split('_');

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "❌ Ce n'est pas votre partie!", ephemeral: true });
        }

        await interaction.deferUpdate();
        return playLimboGame(interaction, parseInt(betAmount), parseFloat(targetMultiplier), true);
      }

      else if (customId.startsWith('limbo_change_')) {
        const [_, __, userId] = customId.split('_');

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "❌ Ce n'est pas votre partie!", ephemeral: true });
        }

        const modal = createChangeParamsModal(userId);
        await interaction.showModal(modal);
      }
    }

    else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('limbo_modal_')) {
        const betAmount = parseInt(interaction.fields.getTextInputValue('betInput'));
        const targetMultiplier = parseFloat(interaction.fields.getTextInputValue('multiplierInput'));

        await interaction.deferUpdate();
        return playLimboGame(interaction, betAmount, targetMultiplier, true);
      }
    }
  }
};

/**
 * Génère un multiplicateur aléatoire, concentré autour de valeurs communes
 */
function getMultiplier(minMultiplier = 1.01, maxMultiplier = 150) {

  const loseChance = Math.floor(Math.random() * (24 - 20 + 1)) + 20;   const roll = Math.random() * 100;

  if (roll <= loseChance) {
    return 1.00;
  }

  const ranges = [
    { min: 1.01, max: 1.2, weight: 20 },
    { min: 1.2, max: 2, weight: 25 },
    { min: 2, max: 5, weight: 25 },
    { min: 5, max: 10, weight: 15 },
    { min: 10, max: 25, weight: 8 },
    { min: 25, max: 50, weight: 5 },
    { min: 50, max: maxMultiplier, weight: 2 }
  ];

  const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
  const random = Math.random() * totalWeight;

  let cumulative = 0;
  let selectedRange = ranges[0];

  for (const range of ranges) {
    cumulative += range.weight;
    if (random <= cumulative) {
      selectedRange = range;
      break;
    }
  }

  const value = selectedRange.min + Math.random() * (selectedRange.max - selectedRange.min);
  return Math.round(value * 100) / 100;
}