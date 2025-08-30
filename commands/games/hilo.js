const simpleReply = require('../../utils/simpleReply');
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

const { registerFont } = require('canvas');
registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
  family: 'Inter 24pt',   weight: 'Bold'
});

module.exports = {
  name: 'hilo',
  description: "Jeu HiLo : devine si la carte suivante sera plus haute ou plus basse",
  cooldown: 2,   async execute(message, args, client) {
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    const CARDS_PATH = 'assets/cards/';

    let player;
    try {
      player = await client.models.Players.findOne({
        where: { userId, guildId }
      });
      
      if (!player) {
        return simpleReply(message, `❌ **Erreur**\n\nVous n'avez pas de compte. Utilisez la commande de création de compte d'abord.`);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du joueur:", error);
      return simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite lors de la récupération de votre compte.`);
    }

    const BET_AMOUNT = args[0];

    if(!BET_AMOUNT || isNaN(BET_AMOUNT)){
        return simpleReply(message, "Utilisation .hilo <mise>");
    };
    const BASE_WIN_AMOUNT = 10; 
    if (player.coins < BET_AMOUNT) {
      return simpleReply(message, `❌ **Fonds insuffisants**\n\nVous avez besoin de \`${BET_AMOUNT}\` ${client.coins} pour jouer au HiLo.`);
    }

    const createShuffledDeck = () => {
      const deck = Array.from({ length: 52 }, (_, i) => i + 1);

      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    };

    const getCardDetails = (cardNumber) => {


      const groupIndex = Math.ceil(cardNumber / 4) - 1; 
      const valueOrder = [
        { value: 1, name: "As", gameValue: 14 },            { value: 13, name: "Roi", gameValue: 13 },          { value: 12, name: "Dame", gameValue: 12 },         { value: 11, name: "Valet", gameValue: 11 },        { value: 10, name: "10", gameValue: 10 },           { value: 9, name: "9", gameValue: 9 },              { value: 8, name: "8", gameValue: 8 },              { value: 7, name: "7", gameValue: 7 },              { value: 6, name: "6", gameValue: 6 },              { value: 5, name: "5", gameValue: 5 },              { value: 4, name: "4", gameValue: 4 },              { value: 3, name: "3", gameValue: 3 },              { value: 2, name: "2", gameValue: 2 }             ];

      const suitIndex = (cardNumber - 1) % 4;       
      let suit, emoji, color;
      switch (suitIndex) {
        case 0: 
          suit = "♣️"; 
          emoji = "♣️";
          color = "#000000";           break;
        case 1: 
          suit = "♠️"; 
          emoji = "♠️";
          color = "#000000";           break;
        case 2: 
          suit = "♥️"; 
          emoji = "♥️";
          color = "#FF0000";           break;
        case 3: 
          suit = "♦️"; 
          emoji = "♦️";
          color = "#FF0000";           break;
      }

      const cardValue = valueOrder[groupIndex % 13];
      
      return { 
        name: cardValue.name, 
        value: cardValue.value, 
        gameValue: cardValue.gameValue,
        suit, 
        emoji,
        color,
        filename: `${cardNumber}.png`,
        displayName: `${cardValue.name} de ${suit}`
      };
    };

    const calculateMultipliers = (cardDetails) => {
      const gameValue = cardDetails.gameValue;
      const totalValues = 13; 
      const higherValues = 14 - gameValue;       const lowerValues = gameValue - 1;   
      const higherProb = higherValues / totalValues;
      const lowerProb = lowerValues / totalValues;


      const higherMulti = higherProb > 0 ? Math.max(1.0, 1.0 / higherProb) : 13.0;       const lowerMulti = lowerProb > 0 ? Math.max(1.0, 1.0 / lowerProb) : 13.0;   
      return {
        higher: Math.round(higherMulti * 10) / 10,
        lower: Math.round(lowerMulti * 10) / 10
      };
    };

    const createCardCanvas = async (cardNumber, cardDetails, multipliers = null, resultData = null) => {

      const canvas = createCanvas(400, 300);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a1c2c');
      gradient.addColorStop(1, '#2a2c3c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      try {

        const cardImage = await loadImage(`${CARDS_PATH}${cardNumber}.png`);

        const cardWidth = 150;
        const cardHeight = 210;
        const x = (canvas.width - cardWidth) / 2;
        const y = 20;
        ctx.drawImage(cardImage, x, y, cardWidth, cardHeight);

        ctx.font = 'bold 20px "Inter 24pt"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(cardDetails.displayName, canvas.width / 2, y + cardHeight + 30);

        if (multipliers) {
          ctx.font = 'bold 18px "Inter 24pt"';
          ctx.fillStyle = '#aaffaa';
          ctx.fillText(`Plus haut ou égal: x${multipliers.higher} | Plus bas ou égal: x${multipliers.lower}`, canvas.width / 2, y + cardHeight + 60);
        }

        if (resultData) {
          ctx.font = 'bold 24px "Inter 24pt"';
          ctx.fillStyle = resultData.hasWon ? '#66ff66' : '#ff6666';
          ctx.fillText(resultData.hasWon ? '✅ GAGNÉ!' : '❌ PERDU!', canvas.width / 2, y + cardHeight + 60);
          
          ctx.font = 'bold 18px "Inter 24pt"';
          ctx.fillStyle = '#ffffff';
          const resultText = resultData.hasWon 
            ? `Vous gagnez ${resultData.winAmount} ${client.coins}` 
            : `Vous perdez ${BET_AMOUNT} ${client.coins}`;
          ctx.fillText(resultText, canvas.width / 2, y + cardHeight + 90);

          ctx.fillStyle = '#aaaaff';
          ctx.fillText(`Choix: ${resultData.choice}`, canvas.width / 2, y + cardHeight + 120);
        }
        
      } catch (error) {
        console.error("Erreur lors de la génération du canvas:", error);

        ctx.font = 'bold 24px "Inter 24pt"';
        ctx.fillStyle = '#ff0000';
        ctx.textAlign = 'center';
        ctx.fillText("Erreur lors du chargement de la carte", canvas.width / 2, canvas.height / 2);
      }

      return canvas.toBuffer();
    };

    const startNewGame = async (existingMessage = null) => {

      if (!existingMessage) {
        try {
          await player.decrement('coins', { by: BET_AMOUNT });
          await player.reload();
        } catch (error) {
          console.error("Erreur lors du débit des pièces:", error);
          return simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite lors du paiement de la mise.`);
        }
      }

      const deck = createShuffledDeck();
      const currentCard = deck.shift();
      const currentCardDetails = getCardDetails(currentCard);
      const multipliers = calculateMultipliers(currentCardDetails);

      const cardBuffer = await createCardCanvas(currentCard, currentCardDetails, multipliers);

      const cardAttachment = new AttachmentBuilder(cardBuffer, { name: 'hilo-card.png' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('higher')
            .setLabel(`Plus haut ou égal (x${multipliers.higher})`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔼'),
          new ButtonBuilder()
            .setCustomId('lower')
            .setLabel(`Plus bas ou égal (x${multipliers.lower})`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔽')
        );

      let gameMessage;
      if (existingMessage) {
        await existingMessage.removeAttachments();
        gameMessage = await existingMessage.edit({
          content: `🎮 **HiLo** - Mise: \`${BET_AMOUNT}\` ${client.coins}\n\nChoisissez si la prochaine carte sera plus haute/égale ou plus basse/égale:`,
          files: [cardAttachment],
          components: [row]
        });
      } else {
        gameMessage = await message.channel.send({
          content: `🎮 **HiLo** - Mise: \`${BET_AMOUNT}\` ${client.coins}\n\nChoisissez si la prochaine carte sera plus haute/égale ou plus basse/égale:`,
          files: [cardAttachment],
          components: [row]
        });
      }

      const handleButtonInteraction = async () => {

        const filter = i => {
          return ['higher', 'lower', 'replay'].includes(i.customId) && i.user.id === message.author.id;
        };
        
        try {
          const collected = await gameMessage.awaitMessageComponent({ filter, time: 30000 });

          if (collected.customId === 'replay') {

            await collected.deferUpdate();

            if (player.coins < BET_AMOUNT) {
              await gameMessage.edit({ 
                content: `❌ **Fonds insuffisants**\n\nVous avez besoin de \`${BET_AMOUNT}\` ${client.coins} pour jouer au HiLo.`,
                files: [],
                components: []
              });
              return;
            }

            try {
              await player.decrement('coins', { by: BET_AMOUNT });
              await player.reload();
            } catch (error) {
              console.error("Erreur lors du débit des pièces:", error);
              await gameMessage.edit({ 
                content: `❌ **Erreur**\n\nUne erreur s'est produite lors du paiement de la mise.`,
                files: [],
                components: []
              });
              return;
            }

            return startNewGame(gameMessage);
          }

          await collected.deferUpdate();

          const nextCard = deck.shift();
          const nextCardDetails = getCardDetails(nextCard);

          let hasWon = false;
          let chosenMultiplier = 1.0;
          let choiceText = '';
          
          if (collected.customId === 'higher') {

            hasWon = nextCardDetails.gameValue >= currentCardDetails.gameValue;
            chosenMultiplier = multipliers.higher;
            choiceText = 'Plus haut ou égal 🔼';
          } else {

            hasWon = nextCardDetails.gameValue <= currentCardDetails.gameValue;
            chosenMultiplier = multipliers.lower;
            choiceText = 'Plus bas ou égal 🔽';
          }

          const winAmount = hasWon ? Math.round(BASE_WIN_AMOUNT * chosenMultiplier) : 0;

          const resultData = {
            hasWon,
            winAmount,
            choice: choiceText
          };

          const resultBuffer = await createCardCanvas(nextCard, nextCardDetails, null, resultData);
          const resultAttachment = new AttachmentBuilder(resultBuffer, { name: 'hilo-result.png' });

          const resultMessage = hasWon 
            ? `🎮 **HiLo** - Vous avez gagné! 🎉\n\nVous avez choisi: ${choiceText}\nCarte précédente: **${currentCardDetails.displayName}**\nNouvelle carte: **${nextCardDetails.displayName}**\n\nAvec un multiplicateur de x${chosenMultiplier}, vous gagnez \`${winAmount}\` ${client.coins}\n\nNouveau solde: \`${player.coins + winAmount}\` ${client.coins}`
            : `🎮 **HiLo** - Vous avez perdu 😔\n\nVous avez choisi: ${choiceText}\nCarte précédente: **${currentCardDetails.displayName}**\nNouvelle carte: **${nextCardDetails.displayName}**\n\nVous perdez votre mise de \`${BET_AMOUNT}\` ${client.coins}\n\nNouveau solde: \`${player.coins}\` ${client.coins}`;

          if (hasWon) {
            await player.increment('coins', { by: winAmount });
            await player.reload();
          }

          const replayRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('replay')
                .setLabel(`Rejouer (${BET_AMOUNT} ${client.coins})`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔄')
            );

          await gameMessage.removeAttachments();           await gameMessage.edit({
            content: resultMessage,
            files: [resultAttachment],
            components: [replayRow]
          });

          handleButtonInteraction();
          
        } catch (error) {
          if (error.name === 'Error [InteractionCollectorError]' || error.code === 'INTERACTION_COLLECTOR_ERROR') {

            await gameMessage.edit({ 
              content: `⏱️ **Temps écoulé**\n\nVous n'avez pas choisi à temps.`,
              files: [],
              components: []
            });
          } else {
            console.error("Erreur dans le jeu HiLo:", error);
            await gameMessage.edit({ 
              content: `❌ **Erreur**\n\nUne erreur s'est produite pendant le jeu: ${error.message}`,
              files: [],
              components: []
            });
          }
        }
      };

      handleButtonInteraction();
    };

    await startNewGame();
  }
};