const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const path = require('path');
const simpleReply = require('../../utils/simpleReply');
let cardImagesCache = null;
const gameStates = new Map(); 
const gameMessages = new Map(); 
const GAME_CONFIG = {
    BET_DURATION: 15000,
    RESULT_DURATION: 5000, 
    MIN_BET: 1,
    MAX_BET: 10000,
    PAYOUT_MULTIPLIER: 2,
    TIE_PAYOUT_MULTIPLIER: 8
};
async function loadCardImagesOnce() {
    if (cardImagesCache) return cardImagesCache;

    const DECK_PATH = path.join(__dirname, '../../assets/cards'); 
    const images = {};
    try {
        for (let i = 1; i <= 53; i++) {
            images[i] = await loadImage(path.join(DECK_PATH, `${i}.png`));
        }
        cardImagesCache = images;
        return images;
    } catch (err) {
        console.error('Erreur lors du chargement des images de cartes:', err);
        throw new Error('Impossible de charger les images des cartes.');
    }
}
function getCardValue(cardId) {
    if (cardId === 53) return 0; 
    return ((cardId - 1) % 13) + 1; 
}
function getCardName(cardId) {
    if (cardId === 53) return 'Joker';
    const suit = Math.floor((cardId - 1) / 13);
    const value = ((cardId - 1) % 13) + 1;
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    return `${values[value - 1]}${suits[suit]}`;
}
async function createGameCanvas(gameState, cardImages) {
    const canvas = createCanvas(900, 700);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 900, 700);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 700);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐉 DRAGON vs TIGER 🐅', 450, 50);
    ctx.font = 'bold 24px Arial';
    if (gameState.phase === 'betting') {
        const secondsLeft = Math.ceil(gameState.timeLeft / 1000);
        if (secondsLeft <= 5) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText(`⏰ FERMETURE DANS ${secondsLeft}s`, 450, 90);
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.fillText('⏰ MISES EN COURS', 450, 90);
        }
    } else if (gameState.phase === 'result') {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('🎯 RÉSULTAT', 450, 90);
    }
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(50, 150, 250, 200);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 150, 250, 200);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('🐉 DRAGON', 175, 230);
    ctx.font = '18px Arial';
    ctx.fillText(`Total: ${gameState.totalBets.dragon}`, 175, 260);
    ctx.fillText(`Joueurs: ${gameState.bets.filter(b => b.side === 'dragon').length}`, 175, 280);
    ctx.font = '16px Arial';
    ctx.fillText('Gain: x2', 175, 300);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(325, 150, 250, 200);
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 4;
    ctx.strokeRect(325, 150, 250, 200);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('🤝 ÉGALITÉ', 450, 230);
    ctx.font = '18px Arial';
    ctx.fillText(`Total: ${gameState.totalBets.tie}`, 450, 260);
    ctx.fillText(`Joueurs: ${gameState.bets.filter(b => b.side === 'tie').length}`, 450, 280);
    ctx.font = '16px Arial';
    ctx.fillText('Gain: x8', 450, 300);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(600, 150, 250, 200);
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 4;
    ctx.strokeRect(600, 150, 250, 200);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('🐅 TIGER', 725, 230);
    ctx.font = '18px Arial';
    ctx.fillText(`Total: ${gameState.totalBets.tiger}`, 725, 260);
    ctx.fillText(`Joueurs: ${gameState.bets.filter(b => b.side === 'tiger').length}`, 725, 280);
    ctx.font = '16px Arial';
    ctx.fillText('Gain: x2', 725, 300);
    if (gameState.phase === 'result' && gameState.dragonCard && gameState.tigerCard) {
        if (cardImages[gameState.dragonCard]) {
            ctx.drawImage(cardImages[gameState.dragonCard], 125, 380, 100, 140);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText(`Dragon: ${getCardName(gameState.dragonCard)}`, 175, 540);
        ctx.fillText(`Valeur: ${getCardValue(gameState.dragonCard)}`, 175, 560);
        if (cardImages[gameState.tigerCard]) {
            ctx.drawImage(cardImages[gameState.tigerCard], 675, 380, 100, 140);
        }
        ctx.fillText(`Tiger: ${getCardName(gameState.tigerCard)}`, 725, 540);
        ctx.fillText(`Valeur: ${getCardValue(gameState.tigerCard)}`, 725, 560);
        ctx.font = 'bold 28px Arial';
        if (gameState.winner === 'dragon') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('🎉 DRAGON GAGNE! 🎉', 450, 590);
        } else if (gameState.winner === 'tiger') {
            ctx.fillStyle = '#f39c12';
            ctx.fillText('🎉 TIGER GAGNE! 🎉', 450, 590);
        } else {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText('🤝 ÉGALITÉ! 🤝', 450, 590);
        }
    }
    ctx.fillStyle = '#34495e';
    ctx.fillRect(50, 100, 800, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Historique:', 60, 120);
    
    let historyX = 150;
    gameState.history.slice(-15).forEach(result => {
        if (result === 'dragon') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('🐉', historyX, 120);
        } else if (result === 'tiger') {
            ctx.fillStyle = '#f39c12';
            ctx.fillText('🐅', historyX, 120);
        } else {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText('🤝', historyX, 120);
        }
        historyX += 35;
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Cliquez sur les boutons ci-dessous pour parier !', 450, 650);
    ctx.fillText('⚠️ Égalité: Si vous ne misez pas dessus, vous perdez la moitié de votre mise', 450, 670);

    return canvas;
}
function createBetButtons(gameState) {
    const row = new ActionRowBuilder();
    
    const dragonButton = new ButtonBuilder()
        .setCustomId('bet_dragon')
        .setLabel('🐉 Miser Dragon')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(gameState.phase !== 'betting');

    const tieButton = new ButtonBuilder()
        .setCustomId('bet_tie')
        .setLabel('🤝 Miser Égalité')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(gameState.phase !== 'betting');

    const tigerButton = new ButtonBuilder()
        .setCustomId('bet_tiger')
        .setLabel('🐅 Miser Tiger')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(gameState.phase !== 'betting');

    row.addComponents(dragonButton, tieButton, tigerButton);
    return row;
}
function createBetModal(side) {
    const sideEmojis = { dragon: '🐉', tiger: '🐅', tie: '🤝' };
    const sideNames = { dragon: 'Dragon', tiger: 'Tiger', tie: 'Égalité' };
    
    const modal = new ModalBuilder()
        .setCustomId(`bet_modal_${side}`)
        .setTitle(`${sideEmojis[side]} Miser sur ${sideNames[side]}`);

    const betInput = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel('Montant de la mise')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Entre ${GAME_CONFIG.MIN_BET} et ${GAME_CONFIG.MAX_BET}`)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    const firstActionRow = new ActionRowBuilder().addComponents(betInput);
    modal.addComponents(firstActionRow);

    return modal;
}
function initializeGameState(guildId, client) {
    const gameState = {
        phase: 'betting', 
        timeLeft: GAME_CONFIG.BET_DURATION,
        bets: [],
        totalBets: { dragon: 0, tiger: 0, tie: 0 },
        dragonCard: null,
        tigerCard: null,
        winner: null,
        history: [],
        lastUpdate: Date.now()
    };
    
    gameStates.set(guildId, gameState);
    startGameLoop(guildId, client);
    return gameState;
}
function startGameLoop(guildId, client) {
    const gameState = gameStates.get(guildId);
    if (!gameState) return;

    const interval = setInterval(async () => {
        const currentTime = Date.now();
        const deltaTime = currentTime - gameState.lastUpdate;
        gameState.lastUpdate = currentTime;

        if (gameState.phase === 'betting') {
            gameState.timeLeft -= deltaTime;
            
            if (gameState.timeLeft <= 0) {
                gameState.phase = 'result';
                gameState.timeLeft = GAME_CONFIG.RESULT_DURATION;
                gameState.dragonCard = Math.floor(Math.random() * 53) + 1;
                gameState.tigerCard = Math.floor(Math.random() * 53) + 1;
                const dragonValue = getCardValue(gameState.dragonCard);
                const tigerValue = getCardValue(gameState.tigerCard);
                
                if (dragonValue > tigerValue) {
                    gameState.winner = 'dragon';
                } else if (tigerValue > dragonValue) {
                    gameState.winner = 'tiger';
                } else {
                    gameState.winner = 'tie';
                }
                
                gameState.history.push(gameState.winner);
                await processWinnings(guildId, gameState, client);
                await updateGameDisplay(guildId, gameState);
            }
        } else if (gameState.phase === 'result') {
            gameState.timeLeft -= deltaTime;
            
            if (gameState.timeLeft <= 0) {
                gameState.phase = 'betting';
                gameState.timeLeft = GAME_CONFIG.BET_DURATION;
                gameState.bets = [];
                gameState.totalBets = { dragon: 0, tiger: 0, tie: 0 };
                gameState.dragonCard = null;
                gameState.tigerCard = null;
                gameState.winner = null;
                await updateGameDisplay(guildId, gameState);
            }
        }
        const secondsLeft = Math.ceil(gameState.timeLeft / 1000);
        if (gameState.phase === 'betting' && secondsLeft <= 5) {
            await updateGameDisplay(guildId, gameState);
        } else if (gameState.phase === 'result') {
            await updateGameDisplay(guildId, gameState);
        }
    }, 1000);
    setTimeout(() => {
        clearInterval(interval);
        gameStates.delete(guildId);
        gameMessages.delete(guildId);
    }, 3600000);
}
async function processWinnings(guildId, gameState, client) {
    const Players = client.models.Players;
    
    for (const bet of gameState.bets) {
        const player = await Players.findOne({ 
            where: { userId: bet.userId, guildId: guildId }
        });
        
        if (player) {
            if (bet.side === gameState.winner) {
                if (gameState.winner === 'tie') {
                    player.coins += bet.amount * GAME_CONFIG.TIE_PAYOUT_MULTIPLIER;
                } else {
                    player.coins += bet.amount * GAME_CONFIG.PAYOUT_MULTIPLIER;
                }
                await player.save();
            } else if (gameState.winner === 'tie' && bet.side !== 'tie') {
                player.coins += Math.floor(bet.amount / 2);
                await player.save();
            }
        }
    }
}
async function updateGameDisplay(guildId, gameState) {
    const gameMessage = gameMessages.get(guildId);
    if (!gameMessage) return;

    try {
        const cardImages = await loadCardImagesOnce();
        const canvas = await createGameCanvas(gameState, cardImages);
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'dragontiger.png' });
        const buttons = createBetButtons(gameState);
        
        await gameMessage.edit({
            files: [attachment],
            components: [buttons]
        });
    } catch (error) {
        console.error('Erreur mise à jour affichage:', error);
    }
}
async function handleBetModal(interaction, client, side) {
    const guildId = interaction.guild.id;
    const gameState = gameStates.get(guildId);
    
    if (!gameState || gameState.phase !== 'betting') {
        return interaction.reply({ content: '❌ Les mises ne sont pas ouvertes actuellement.', ephemeral: true });
    }
    
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    if (isNaN(amount) || amount < GAME_CONFIG.MIN_BET || amount > GAME_CONFIG.MAX_BET) {
        return interaction.reply({ 
            content: `❌ **Mise invalide**\n\nMise entre ${GAME_CONFIG.MIN_BET} et ${GAME_CONFIG.MAX_BET} ${client.coins}.`, 
            ephemeral: true 
        });
    }
    const existingBet = gameState.bets.find(bet => bet.userId === interaction.user.id);
    if (existingBet) {
        return interaction.reply({ content: '❌ Vous avez déjà misé pour cette partie.', ephemeral: true });
    }
    const player = await client.models.Players.findOne({ 
        where: { userId: interaction.user.id, guildId: guildId }
    });
    
    if (!player || player.coins < amount) {
        return interaction.reply({ 
            content: `❌ **Solde insuffisant**\n\nVous n'avez pas assez de ${client.coins}.`, 
            ephemeral: true 
        });
    }
    player.coins -= amount;
    await player.save();
    gameState.bets.push({
        userId: interaction.user.id,
        username: interaction.user.username,
        side: side,
        amount: amount
    });
    
    gameState.totalBets[side] += amount;
    
    const sideEmojis = { dragon: '🐉', tiger: '🐅', tie: '🤝' };
    const multiplier = side === 'tie' ? GAME_CONFIG.TIE_PAYOUT_MULTIPLIER : GAME_CONFIG.PAYOUT_MULTIPLIER;
    
    interaction.reply({ 
        content: `✅ **Mise enregistrée**\n\n${sideEmojis[side]} **${side.toUpperCase()}** - ${amount} ${client.coins} (Gain potentiel: x${multiplier})`, 
        ephemeral: true 
    });
    await updateGameDisplay(guildId, gameState);
}

module.exports = {
    name: 'dragontiger',
    description: 'Jeu Dragon vs Tiger - Pariez sur le dragon, le tiger ou l\'égalité!',
    async execute(message, args, client) {
        try {
            const guildId = message.guild.id;
            if (!gameStates.has(guildId)) {
                initializeGameState(guildId, client);
            }
            
            const gameState = gameStates.get(guildId);
            await displayGame(message, client, gameState);
            
        } catch (error) {
            console.error('Erreur Dragon Tiger:', error);
            simpleReply(message, '❌ Une erreur est survenue lors du jeu Dragon Tiger.');
        }
    },
    async handleButtonInteraction(interaction, client) {
        if (interaction.customId.startsWith('bet_')) {
            const side = interaction.customId.split('_')[1];
            const modal = createBetModal(side);
            await interaction.showModal(modal);
        }
    },
    async handleModalInteraction(interaction, client) {
        if (interaction.customId.startsWith('bet_modal_')) {
            const side = interaction.customId.split('_')[2];
            await handleBetModal(interaction, client, side);
        }
    }
};
async function displayGame(message, client, gameState) {
    try {
        const cardImages = await loadCardImagesOnce();
        const canvas = await createGameCanvas(gameState, cardImages);
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'dragontiger.png' });
        const buttons = createBetButtons(gameState);
        
        const gameMessage = await message.channel.send({
            files: [attachment],
            components: [buttons]
        });
        gameMessages.set(message.guild.id, gameMessage);
        
    } catch (error) {
        console.error('Erreur affichage:', error);
        simpleReply(message, '❌ Erreur lors de l\'affichage du jeu.');     }
}