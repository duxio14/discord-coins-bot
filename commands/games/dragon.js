const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const { registerFont } = require('canvas');
registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
  family: 'Inter 24pt',
  weight: 'Bold'
});

if (!global.gameDataCollections) {
  global.gameDataCollections = {};
}
if (!global.gameDataCollections.dragonLore) {
  global.gameDataCollections.dragonLore = new Map();
}

const ASSETS_PATH = path.join(__dirname, '../../assets/dragon-lore');

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1000;

const CELL_SIZE = 60;
const GAP_X = 115;
const startX = 550;
const startY = 900;

const ROW_COUNT = 9;
const COL_COUNT = 4;

const DIFFICULTY_CONFIG = {
  facile: {
    bombsPerRow: 1,
    multiplierBase: 1.4,
    name: 'Facile'
  },
  difficile: {
    bombsPerRow: 2,
    multiplierBase: 2.5,
    name: 'Difficile'
  }
};

const GRID_POSITIONS = [];

for (let row = 0; row < ROW_COUNT; row++) {
  const rowPositions = [];
  for (let col = 0; col < COL_COUNT; col++) {
    rowPositions.push({
      x: startX + col * (CELL_SIZE + GAP_X),
      y: startY - row * (CELL_SIZE + 22)
    });
  }
  GRID_POSITIONS.push(rowPositions);
}

const BET_TEXT_X = 50;
const BET_TEXT_Y = 288;
const MULTIPLIER_TEXT_X = 50;
const MULTIPLIER_TEXT_Y = 413;

module.exports = {
  name: 'dragon',
  usage: "<mise> [facile|difficile]",
  description: 'Jouez à Dragon Lore, un jeu de plateau avec des dragons',
  rules: "`🐉 **Dragon Tower – Montez vers la gloire !**\n\nGrimpez les étages d'une tour gardée par un dragon.\nÀ chaque étage, choisissez l'un des coffres.\n\n**Difficultés :**\n- 🟢 **Facile** : 1 dragon par ligne (mult. x1.4)\n- 🔴 **Difficile** : 2 dragons par ligne (mult. x2.5)\n\n- 💰 Si vous tombez sur un coffre **sûr**, vous progressez et votre **multiplicateur augmente**.\n- 💥 Si vous ouvrez le **mauvais coffre**, vous perdez tout.\n\nVous pouvez **encaisser vos gains à tout moment** !\n\nJusqu'où oserez-vous monter ? 🔥`",
  
  async execute(message, args, client) {
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const gameKey = `${guildId}-${userId}`;
    const gameCollection = global.gameDataCollections.dragonLore;
    let gameData = gameCollection.get(gameKey);
    let player = await client.models.Players.findOne({
      where: {
        userId: userId,
        guildId: guildId
      }
    });

    if (gameData && gameData.gameData.gameState === 'playing') {
      return simpleReply(message, "Vous avez déjà une partie en cours. Utilisez les boutons pour jouer ou `dragon reset` pour recommencer.");
    }

    try {
      if (!player) {
        return simpleReply(message, "Vous n'avez pas de compte. Utilisez la commande `create-account` pour commencer.");
      }

      let betAmount;
      const lastArg = args[args.length - 1]?.toLowerCase();
let difficulty = 'facile';

if (lastArg === 'facile' || lastArg === 'difficile') {
  difficulty = lastArg;
  args.pop(); }

      if (args[0] === "all") {
        betAmount = player.coins;
      } else {
        betAmount = parseInt(args[0]) || 50;
      }

      if (isNaN(betAmount) || betAmount <= 0) {
        return simpleReply(message, 'La mise doit être un nombre positif.');
      }
      if (player.coins < betAmount) {
        return simpleReply(message, `Vous n'avez pas assez de pièces pour jouer. Il vous faut au moins \`${betAmount}\` 💰`);
      }

      if (!gameData || (args.length > 0 && args[0].toLowerCase() === 'reset')) {

        if (gameData && gameData.gameData.gameState === 'playing' && args.length > 0 && args[0].toLowerCase() === 'reset') {
          await player.update({
            coins: player.coins + gameData.gameData.bet
          });
        }


        console.log(difficulty)

        gameData = {
          userId: userId,
          guildId: guildId,
          gameType: 'dragon-lore',
          gameData: {
            board: createNewBoard(difficulty),
            currentRow: 0,
            revealed: Array(9).fill().map(() => Array(4).fill(false)),
            bet: betAmount,
            multiplier: 1.0,
            gameState: 'playing',
            hasStarted: true,
            difficulty: difficulty
          }
        };

        await player.update({
          coins: player.coins - betAmount
        });

        gameCollection.set(gameKey, gameData);

        return sendGameBoardWithButtons(message, gameData.gameData, player);
      }

      const game = gameData.gameData;


if (game.gameState !== 'playing') {
  gameCollection.delete(gameKey);

  return module.exports.execute(message, [...args, game.difficulty], client);
}

      sendGameBoardWithButtons(message, game, player);
    } catch (error) {
      console.error("Error in dragon-lore command:", error);
      simpleReply(message, "Une erreur s'est produite pendant le jeu.");
    }
  },

  async handleButton(interaction, client) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const gameKey = `${guildId}-${userId}`;
    const buttonId = interaction.customId;

    const gameCollection = global.gameDataCollections.dragonLore;

    try {
      let gameData = gameCollection.get(gameKey);

      if (!gameData) {
        return interaction.reply({
          content: "Vous n'avez pas de partie en cours. Utilisez la commande `dragon` pour commencer.",
          ephemeral: true
        });
      }

      let player = await client.models.Players.findOne({
        where: {
          userId: userId,
          guildId: guildId
        }
      });

      const game = gameData.gameData;

      if (game.gameState !== 'playing') {
        const canvasBuffer = await generateGameCanvas(game, player);
        const attachment = new AttachmentBuilder(canvasBuffer, { name: 'dragon-lore.png' });

        return interaction.update({
          content: null,
          files: [attachment],
          components: []
        });
      }

      if (buttonId.startsWith('dragon_column_')) {
        const choice = parseInt(buttonId.split('_')[2]) - 1;
        
        game.revealed[game.currentRow][choice] = true;

        const isBomb = game.board[game.currentRow][choice] === 'B';

        if (isBomb) {
          game.gameState = 'lost';
          revealAllCells(game);
          gameData.gameData = game;
          gameCollection.set(gameKey, gameData);
          return updateGameBoardWithButtons(interaction, game, player);
        } else {

          const difficultyConfig = DIFFICULTY_CONFIG[game.difficulty];
          game.multiplier = Math.pow(difficultyConfig.multiplierBase, game.currentRow + 1);

          if (game.currentRow < 8) {
            game.currentRow++;
          } else {
            game.gameState = 'won';
            revealAllCells(game);
            const winnings = Math.floor(game.bet * game.multiplier);
            await player.update({
              coins: player.coins + winnings
            });
          }

          gameData.gameData = game;
          gameCollection.set(gameKey, gameData);
          return updateGameBoardWithButtons(interaction, game, player);
        }
      } else if (buttonId === 'dragon_encaisser') {
        if (game.currentRow > 0) {
          const winnings = Math.floor(game.bet * game.multiplier);
          game.gameState = 'cashed_out';
          revealAllCells(game);
          gameData.gameData = game;
          gameCollection.set(gameKey, gameData);

          await player.update({
            coins: player.coins + winnings
          });

          return updateGameBoardWithButtons(interaction, game, player);
        } else {
          return interaction.reply({
            content: "Vous devez d'abord avancer dans le jeu avant de pouvoir encaisser.",
            ephemeral: true
          });
        }
      } else if (buttonId === 'dragon_reset') {
        const newGame = {
          board: createNewBoard(game.difficulty),
          currentRow: 0,
          revealed: Array(9).fill().map(() => Array(4).fill(false)),
          bet: game.bet,
          multiplier: 1.0,
          gameState: 'playing',
          hasStarted: true,
          difficulty: game.difficulty
        };

        await player.update({
          coins: player.coins - game.bet
        });

        gameData.gameData = newGame;
        gameCollection.set(gameKey, gameData);
        return updateGameBoardWithButtons(interaction, newGame, player);
      }
    } catch (error) {
      console.error("Error in dragon-lore button handler:", error);
      interaction.reply({
        content: "Une erreur s'est produite pendant le jeu.",
        ephemeral: true
      });
    }
  }
};

function revealAllCells(game) {
  for (let row = 0; row <= 8; row++) {
    for (let col = 0; col < 4; col++) {
      game.revealed[row][col] = true;
    }
  }
}

function createNewBoard(difficulty = 'facile') {
  const board = [];
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  for (let row = 0; row < 9; row++) {
    const rowData = Array(4).fill('C');

    const bombPositions = [];
    while (bombPositions.length < difficultyConfig.bombsPerRow) {
      const randomPos = Math.floor(Math.random() * 4);
      if (!bombPositions.includes(randomPos)) {
        bombPositions.push(randomPos);
      }
    }

    bombPositions.forEach(pos => {
      rowData[pos] = 'B';
    });
    
    board.push(rowData);
  }

  return board;
}

async function generateGameCanvas(game, player) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  try {
    const backgroundImage = await loadImage(path.join(ASSETS_PATH, 'dragon-header.png'));
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const difficultyConfig = DIFFICULTY_CONFIG[game.difficulty];
    ctx.fillStyle = game.difficulty === 'facile' ? '#4CAF50' : '#E53935';
    ctx.font = 'bold 20px "Inter 24pt"';
    ctx.textAlign = 'right';
    ctx.fillText(`${difficultyConfig.name}`, CANVAS_WIDTH - 50, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Inter 24pt"';
    ctx.textAlign = 'left';
    ctx.fillText(`${game.bet}`, BET_TEXT_X, BET_TEXT_Y);
    ctx.fillText(`x${game.multiplier.toFixed(2)}`, MULTIPLIER_TEXT_X, MULTIPLIER_TEXT_Y);

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 4; col++) {
        if (game.revealed[row][col]) {
          const position = GRID_POSITIONS[row][col];

          if (game.board[row][col] === 'B') {
            await drawDragonHead(ctx, position.x - 5, position.y, CELL_SIZE);
          } else {
            await drawEgg(ctx, position.x, position.y, CELL_SIZE);
          }
        }
      }
    }

    if (game.gameState === 'won') {
      const winnings = Math.floor(game.bet * game.multiplier);
      drawNotification(ctx, 'VICTOIRE!', `+${winnings} pièces`, '#4CAF50');
    } else if (game.gameState === 'lost') {
      drawNotification(ctx, 'DRAGON!', `Vous avez perdu ${game.bet} pièces`, '#E53935');
    } else if (game.gameState === 'cashed_out') {
      const winnings = Math.floor(game.bet * game.multiplier);
      drawNotification(ctx, 'GAINS ENCAISSÉS!', `+${winnings} pièces`, '#4CAF50');
    }
  } catch (err) {
    console.error("Erreur de chargement de l'image de fond:", err);

    ctx.fillStyle = '#151E2D';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Inter 24pt"';
    ctx.textAlign = 'center';
    ctx.fillText("Erreur de chargement de l'image du jeu", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  return canvas.toBuffer();
}

function drawNotification(ctx, title, message, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(CANVAS_WIDTH / 2 - 250, 400, 500, 150, 20);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = 'bold 40px "Inter 24pt"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_WIDTH / 2, 460);

  ctx.font = 'bold 28px "Inter 24pt"';
  ctx.fillText(message, CANVAS_WIDTH / 2, 510);
}

async function drawDragonHead(ctx, x, y, size) {
  const dragonHead = await loadImage(path.join(ASSETS_PATH, 'dragon.png'));
  ctx.drawImage(dragonHead, x, y, size, size);
}

async function drawEgg(ctx, x, y, size) {
  const egg = await loadImage(path.join(ASSETS_PATH, 'egg.png'));
  const ratio = egg.width / egg.height;
  let drawWidth, drawHeight;

  if (ratio > 1) {
    drawWidth = size;
    drawHeight = size / ratio;
  } else {
    drawHeight = size;
    drawWidth = size * ratio;
  }

  ctx.drawImage(egg, x, y, drawWidth, drawHeight);
}

function createGameButtons(game) {
  const rows = [];

  if (game.gameState !== 'playing') {
    return [];
  }

  const columnButtons = new ActionRowBuilder();

  for (let i = 1; i <= 4; i++) {
    let em = "";

    if(i === 1) em = "<:1_:1370003084067213312>";
    else if (i === 2) em = "<:2_:1370003082431299624>";
    else if (i === 3) em  = "<:3_:1370003080740868178>";
    else em = "<:4_:1370003078597578762>";

    columnButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`dragon_column_${i}`)
        .setEmoji(em)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  rows.push(columnButtons);

  const actionButtons = new ActionRowBuilder();

  actionButtons.addComponents(
    new ButtonBuilder()
      .setCustomId('dragon_encaisser')
      .setLabel("Retirer")
      .setEmoji("<:encaisser:1370005238433710160>")
      .setStyle(ButtonStyle.Success)
      .setDisabled(game.currentRow === 0)
  );

  rows.push(actionButtons);

  return rows;
}

async function sendGameBoardWithButtons(message, game, player) {
  try {
    const canvasBuffer = await generateGameCanvas(game, player);
    const attachment = new AttachmentBuilder(canvasBuffer, { name: 'dragon-lore.png' });

    const buttons = createGameButtons(game);

    await message.channel.send({
      files: [attachment],
      components: buttons
    });
  } catch (error) {
    console.error("Error sending game board:", error);
    simpleReply(message, "Une erreur s'est produite lors de l'affichage du jeu.");
  }
}

async function updateGameBoardWithButtons(interaction, game, player) {
  try {
    const canvasBuffer = await generateGameCanvas(game, player);
    const attachment = new AttachmentBuilder(canvasBuffer, { name: 'dragon-lore.png' });

    const buttons = createGameButtons(game);

    await interaction.update({
      files: [attachment],
      components: buttons
    });
  } catch (error) {
    console.error("Error updating game board:", error);
    await interaction.reply({
      content: "Une erreur s'est produite lors de la mise à jour du jeu.",
      ephemeral: true
    });
  }
}