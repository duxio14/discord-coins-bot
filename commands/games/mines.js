const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const { description } = require('./bj');

class MinesweeperGame {
  constructor(userId, bet, mineCount) {
    this.userId = userId;
    this.bet = parseInt(bet);
    this.mineCount = parseInt(mineCount);
    this.grid = Array(24).fill(false);     this.revealedCells = [];
    this.gameOver = false;
    this.win = false;
    this.currentMultiplier = 1.0;
    this.potentialWinnings = this.bet;

    this.placeMines();

    this.maxMultiplier = this.calculateMaxMultiplier();
  }

  placeMines() {
    let minesPlaced = 0;
    while (minesPlaced < this.mineCount) {
      const position = Math.floor(Math.random() * 24);
      if (!this.grid[position]) {
        this.grid[position] = true;
        minesPlaced++;
      }
    }
  }
  
  calculateMultiplier(revealed = 0) {
    const totalCells = 24;     const safeCells = totalCells - this.mineCount;
    const houseEdge = 0.01;   
    if (revealed >= safeCells) return this.maxMultiplier;
  
    let chance = 1;
    for (let i = 0; i < revealed; i++) {
      chance *= (safeCells - i) / (totalCells - i);
    }
  
    const multiplier = (1 - houseEdge) / chance;
  
    return parseFloat(multiplier.toFixed(2));
  }

  calculateMaxMultiplier() {


    return parseFloat((1.0 + Math.pow(this.mineCount / 24, 0.7) * 20).toFixed(2));   }

  revealCell(position) {
    if (this.gameOver || this.revealedCells.includes(position)) {
      return false;
    }

    this.revealedCells.push(position);

    if (this.grid[position]) {
      this.gameOver = true;
      return { type: 'mine', position };
    }

    this.currentMultiplier = this.calculateMultiplier(this.revealedCells.length);
    this.potentialWinnings = Math.floor(this.bet * this.currentMultiplier);

    const safeCells = 24 - this.mineCount;     if (this.revealedCells.length === safeCells) {
      this.gameOver = true;
      this.win = true;
      return { type: 'win', position, multiplier: this.currentMultiplier };
    }
    
    return { type: 'safe', position, multiplier: this.currentMultiplier };
  }

  cashOut() {
    if (this.gameOver) return false;
    
    this.gameOver = true;
    this.win = true;
    return { winnings: this.potentialWinnings, multiplier: this.currentMultiplier };
  }

  getGameState() {
    return {
      bet: this.bet,
      mineCount: this.mineCount,
      revealedCells: this.revealedCells,
      gameOver: this.gameOver,
      win: this.win,
      currentMultiplier: this.currentMultiplier,
      potentialWinnings: this.potentialWinnings,
      maxMultiplier: this.maxMultiplier
    };
  }
}

const activeGames = new Map();

function createGameEmbed(user, gameState, messageText = '', minimalLoss = false) {
    const embed = new EmbedBuilder();
  
    if (minimalLoss) {
      embed
        .setTitle('💥 Perdu !')
        .setColor('#ff4444')
        .setDescription(`Vous avez perdu \`${gameState.bet}\` coins.`);
      return embed;
    }

    const description = [`
  **Mise :** \`${gameState.bet}\` coins  
  **Mines :** \`${gameState.mineCount}\`  
  **Gains Actuels :** \`${gameState.potentialWinnings}\` coins (x${gameState.currentMultiplier})
      `.trim()];

    if (!gameState.gameOver && gameState.revealedCells.length > 0) {
      description.push(`\n**Pour encaisser vos gains:** Cliquez sur le bouton **RETIRER 💸** ou utilisez \`!mines cashout\``);
    }
  
    embed
      .setTitle('🎯 Mines')
      .setColor(gameState.gameOver ? (gameState.win ? '#00C851' : '#ff4444') : '#3399FF')
      .setDescription(description.join(''));
  
    if (messageText) {
      embed.addFields({ name: 'Résultat', value: messageText });
    }
  
    embed.setFooter({ text: `Joueur : ${user.username}` });
  
    return embed;
  }

async function handleGameInteraction(interaction, game, gameMessage, client) {
  await interaction.deferUpdate();
  
  const customId = interaction.customId;
  const guildId = interaction.guild.id;

  if (customId === 'withdraw') {
    const result = game.cashOut();
    
    if (!result) {
      return;     }
    
    try {
      const player = await client.models.Players.findOne({
        where: {
          userId: game.userId,
          guildId: guildId
        }
      });
      
      if (player) {

        player.coins += result.winnings;
        await player.save();
      }

      const messageText = `Vous avez **retiré** \`${result.winnings}\` 💸! (X${result.multiplier})`;

      const updatedEmbed = createGameEmbed(interaction.user, game.getGameState(), messageText);
      const updatedRows = createButtonRows(game, true);       
      await gameMessage.edit({
        embeds: [updatedEmbed],
        components: updatedRows
      });

      activeGames.delete(game.userId);
    } catch (error) {
      console.error('Erreur lors de l\'encaissement des gains:', error);
      await interaction.followUp({ 
        content: 'Une erreur est survenue lors de l\'encaissement des gains.', 
        ephemeral: true 
      });
    }
    
    return;
  }

  if (customId.startsWith('cell_')) {
    const position = parseInt(customId.split('_')[1]);
    const result = game.revealCell(position);
    
    if (!result) {
      return;     }

    let messageText = '';

    if (result.type === 'mine' || result.type === 'win') {
      try {
        const player = await client.models.Players.findOne({
          where: {
            userId: game.userId,
            guildId: guildId
          }
        });
        
        if (player) {
          if (result.type === 'win') {

            const winnings = Math.floor(game.bet * result.multiplier);
            player.coins += winnings;
            
            messageText = `Vous avez **gagné** \`${winnings}\` 💰! (X${result.multiplier})`;
          } else {

            messageText = `BOOM! Vous avez **perdu** \`${game.bet}\` 💰`;
          }
          
          await player.save();
        }

        activeGames.delete(game.userId);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du solde:', error);
        await interaction.followUp({ 
          content: 'Une erreur est survenue lors de la mise à jour de votre solde.', 
          ephemeral: true 
        });
        return;
      }
    } else {

      messageText = `X${result.multiplier} (Gains potentiels: ${game.potentialWinnings} coins)`;
    }

    const updatedEmbed = createGameEmbed(interaction.user, game.getGameState(), messageText);

    const updatedRows = createButtonRows(game, game.gameOver);

    await gameMessage.edit({
      embeds: [updatedEmbed],
      components: updatedRows
    });
  }
}

function createButtonRows(game, disableAll = false) {
  const rows = [];

  for (let i = 0; i < 5; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 5; j++) {
      const pos = i * 5 + j;

      if (pos === 24) {
        const withdrawButton = new ButtonBuilder()
          .setCustomId('withdraw')
          .setEmoji("<:encaisser:1370005238433710160>")
          .setLabel('Retirer')
          .setStyle(ButtonStyle.Success);

        if (disableAll || game.gameOver || game.revealedCells.length === 0) {
          withdrawButton.setDisabled(true);
        }
        
        row.addComponents(withdrawButton);
      } else {
        let button = new ButtonBuilder()
          .setCustomId(`cell_${pos}`)
          .setLabel(`ㅤ`)
          .setStyle(ButtonStyle.Secondary);

        if (game.gameOver && game.grid[pos]) {

          button = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:bombe:1370009756898562058>")
            .setCustomId(`cell_${pos}_`)
            .setDisabled(true);
        } else if (game.revealedCells.includes(pos)) {

          button = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:diamant:1370009557039976578>")
            .setCustomId(`cell_${pos}__`)
            .setDisabled(true);
        }else if (game.gameOver && !game.grid[pos] && !game.revealedCells.includes(pos)) {

          button = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:diamant:1370009557039976578>")             .setCustomId(`cell_${pos}___`)
            .setDisabled(true);
        }

        if (disableAll) {
          button.setDisabled(true);
        }
        
        row.addComponents(button);
      }
    }
    rows.push(row);
  }
  
  return rows;
}

async function sendGameInterface(message, game, client) {
  const gameState = game.getGameState();

  const embed = createGameEmbed(message.author, gameState);

  const rows = createButtonRows(game);

  const gameMessage = await message.reply({
    embeds: [embed],
    components: rows
  });

  const filter = i => i.user.id === message.author.id;
  const collector = gameMessage.createMessageComponentCollector({ filter, time: 300000 });
  
  collector.on('collect', async (interaction) => {
    await handleGameInteraction(interaction, game, gameMessage, client);
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && !game.gameOver) {

      try {
        const guildId = message.guild.id;
        const player = await client.models.Players.findOne({
          where: {
            userId: game.userId,
            guildId: guildId
          }
        });

        game.gameOver = true;

        const finalEmbed = createGameEmbed(message.author, game.getGameState(), 'Temps écoulé! Vous avez perdu votre mise.');
        await gameMessage.edit({
          embeds: [finalEmbed],
          components: []         });

        activeGames.delete(message.author.id);
      } catch (error) {
        console.error('Erreur lors de la fin du jeu par timeout:', error);
      }
    }
  });
}

async function handleCashoutCommand(message, client) {

  if (!activeGames.has(message.author.id)) {
    return simpleReply(message, 'Vous n\'avez pas de partie de Mines en cours.');
  }
  
  const game = activeGames.get(message.author.id);
  const guildId = message.guild.id;
  
  const result = game.cashOut();
  if (!result) {
    return simpleReply(message, 'Impossible d\'encaisser. Le jeu est déjà terminé.');
  }

  try {
    const player = await client.models.Players.findOne({
      where: {
        userId: game.userId,
        guildId: guildId
      }
    });
    
    if (player) {

      player.coins += result.winnings;
      await player.save();
    }

    activeGames.delete(game.userId);

    return simpleReply(message, `✅ Encaissement effectué! Vous avez gagné **${result.winnings}** coins (x${result.multiplier}).`);
  } catch (error) {
    console.error('Erreur lors de l\'encaissement des gains:', error);
    return simpleReply(message, 'Une erreur est survenue lors de l\'encaissement des gains.');
  }
}

module.exports = {
  name: 'mines',
  usage: '<mise> [nombre de mines]  ',
  rules: `💣 **Mines – Tente ta chance, évite les bombes !**\n\nChoisis le **nombre de mines** à placer sur une grille 5x5.\nClique sur les cases pour révéler des diamants 💎 et faire grimper ton **multiplicateur**.\n\n- 💥 Si tu cliques sur une **mine**, tu perds tout.\n- 💰 Tu peux **encaisser tes gains à tout moment** avant d’exploser.\n\nMoins il y a de mines, plus c’est sûr… mais moins ça rapporte !\n\nJusqu’où oseras-tu aller ? 🔥`,
  description: "Jouer au jeu des mines.",
  async execute(message, args, client) {
    if (!message.guild) return;

    if (args.length > 0 && args[0].toLowerCase() === 'cashout') {
      return handleCashoutCommand(message, client);
    }

    if (activeGames.has(message.author.id)) {
      return simpleReply(message, 'Vous avez déjà un jeu en cours! Terminez-le avant d\'en commencer un nouveau.');
    }

    if (args.length < 2) {
      return simpleReply(message, 'Usage: `.mines [mise] [nombre_de_mines]`\nExemple: `.mines 100 5`');
    }
    
    const bet = parseInt(args[0]);
    const mineCount = parseInt(args[1]);

    if (isNaN(bet) || bet <= 0) {
      return simpleReply(message, 'La mise doit être un nombre positif.');
    }
    
    if (isNaN(mineCount) || mineCount < 1 || mineCount > 24) {
      return simpleReply(message, 'Le nombre de mines doit être entre 2 et 16.');
    }
    
    try {

      const guildId = message.guild.id;
      const player = await client.models.Players.findOne({
        where: {
          userId: message.author.id,
          guildId: guildId
        }
      });
      
      if (!player) {

        await client.models.Players.create({
          userId: message.author.id,
          guildId: guildId,
          coins: 1000,           banque: 0
        });
        
        return simpleReply(message, 'Un compte a été créé pour vous avec 1000 coins. Vous pouvez maintenant jouer aux mines!');
      }

      if (player.coins < bet) {
        return simpleReply(message, `Vous n'avez pas assez de coins. Votre solde: ${player.coins} coins.`);
      }

      player.coins -= bet;
      await player.save();

      const game = new MinesweeperGame(message.author.id, bet, mineCount);
      activeGames.set(message.author.id, game);

      await sendGameInterface(message, game, client);
    } catch (error) {
      console.error('Erreur lors du démarrage du jeu:', error);
      simpleReply(message, 'Une erreur est survenue lors du démarrage du jeu.');
    }
  },

  cashout: async function(message, client) {
    return handleCashoutCommand(message, client);
  }
};