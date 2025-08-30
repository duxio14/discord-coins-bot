const { AttachmentBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const simpleReply = require('../../utils/simpleReply');
const path = require('path');
const { aliases } = require('../players/lb');

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const CARD_WIDTH = 82;
const CARD_HEIGHT = 123;
const CARD_SPACING = 15;
const DECK_PATH = path.join(__dirname, '../../assets/cards');
const GAME_TIMEOUT = 20000; 
const COLORS = {
    text: '#ffffff',
    win: '#4CAF50',       lose: '#F44336',     push: '#2196F3'  };

let cardImagesCache = null;
let fontRegistered = false;

registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
    family: 'Inter 24pt',     weight: 'Bold'
});

async function loadCardImagesOnce() {
    if (cardImagesCache) return cardImagesCache;

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

const activeGames = new Map();

function createCardMapping() {
    const mapping = {};

    mapping['A_of_clubs'] = 1;
    mapping['A_of_spades'] = 2;
    mapping['A_of_hearts'] = 3;
    mapping['A_of_diamonds'] = 4;

    const suits = ['clubs', 'spades', 'hearts', 'diamonds'];
    const values = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

    let cardNumber = 5;
    for (const value of values) {
        for (const suit of suits) {
            mapping[`${value}_of_${suit}`] = cardNumber++;
        }
    }

    mapping['back'] = 53;

    return mapping;
}

const cardMapping = createCardMapping();

function drawNotification(ctx, title, message, color) {

    const notifWidth = 500;
    const notifHeight = 150;
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(centerX - notifWidth / 2, centerY - notifHeight / 2, notifWidth, notifHeight, 20);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = 'bold 40px "Inter 24pt"';
    if (!ctx.font.includes("Inter")) {

        ctx.font = 'bold 40px Montserrat-Bold';
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(title, centerX, centerY - 15);

    ctx.font = 'bold 28px "Inter 24pt"';

    ctx.fillText(message, centerX, centerY + 35);
}

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.gameStatus = 'active';         this.betAmount = 0;
        this.canDouble = true;         this.hasDoubled = false;     }


    playerDouble() {
        if (!this.canDouble || this.hasDoubled) {
            return this;         }

        this.hasDoubled = true;
        this.betAmount *= 2; 
        this.playerHand.push(this.drawCard());
        this.calculateScores();

        if (this.playerScore > 21) {
            this.gameStatus = 'lose';
        } else {
            this.gameStatus = 'stand';
            this.dealerPlay();
        }

        return this;
    }

    playerHit() {
        this.playerHand.push(this.drawCard());
        this.calculateScores();
        this.canDouble = false; 
        if (this.playerScore > 21) {
            this.gameStatus = 'lose';
        }

        return this;
    }
    playerStand() {
        this.canDouble = false;
        this.gameStatus = 'stand';
        this.dealerPlay();
        return this;
    }

    canPlayerDouble() {
        return this.canDouble &&
            this.playerHand.length === 2 &&
            this.gameStatus === 'active' &&
            !this.hasDoubled;
    }

    async init() {

        this.createDeck();
        this.shuffleDeck();

        this.dealInitialCards();
        this.calculateScores();
        this.checkBlackjack();

        return this;
    }

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        this.deck = [];
        for (const suit of suits) {
            for (const value of values) {
                this.deck.push({ suit, value });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealInitialCards() {
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.createDeck();
            this.shuffleDeck();
        }
        return this.deck.pop();
    }

    calculateScores() {
        this.playerScore = this.calculateHandScore(this.playerHand);
        this.dealerScore = this.calculateHandScore(this.dealerHand);
    }

    calculateHandScore(hand) {
        let score = 0;
        let aces = 0;

        for (const card of hand) {
            if (card.value === 'A') {
                aces++;
                score += 11;
            } else if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    checkBlackjack() {
        if (this.playerScore === 21) {
            if (this.dealerScore === 21) {
                this.gameStatus = 'push';
            } else {
                this.gameStatus = 'blackjack';
            }
        } else if (this.dealerScore === 21) {
            this.gameStatus = 'lose';
        }
    }

    playerHit() {
        this.playerHand.push(this.drawCard());
        this.calculateScores();

        if (this.playerScore > 21) {
            this.gameStatus = 'lose';
        }

        return this;
    }

    playerStand() {
        this.gameStatus = 'stand';
        this.dealerPlay();
        return this;
    }

    dealerPlay() {
        while (this.dealerScore < 17) {
            this.dealerHand.push(this.drawCard());
            this.calculateScores();
        }

        this.determineWinner();
    }

    determineWinner() {
        if (this.playerScore > 21) {
            this.gameStatus = 'lose';
        } else if (this.dealerScore > 21) {
            this.gameStatus = 'win';
        } else if (this.playerScore > this.dealerScore) {
            this.gameStatus = 'win';
        } else if (this.playerScore < this.dealerScore) {
            this.gameStatus = 'lose';
        } else {
            this.gameStatus = 'push';
        }
    }

    getWinMultiplier() {
        if (this.gameStatus === 'blackjack') return 2.5;
        if (this.gameStatus === 'win') return 2;
        if (this.gameStatus === 'push') return 1;
        return 0;
    }

    getNotificationInfo() {
        let title, message, color;

        switch (this.gameStatus) {
            case 'blackjack':
                title = "BLACKJACK!";
                message = `+${formatNumber(Math.floor(this.betAmount * 2.5))} coins`;
                color = COLORS.win;
                break;
            case 'win':
                title = "VICTOIRE!";
                message = `+${formatNumber(Math.floor(this.betAmount * 2))} coins`;
                color = COLORS.win;
                break;
            case 'push':
                title = "ÉGALITÉ";
                message = `+${formatNumber(this.betAmount)} coins`;
                color = COLORS.push;
                break;
            case 'lose':
                title = "DÉFAITE";
                message = `-${formatNumber(this.betAmount)} coins`;
                color = COLORS.lose;
                break;
            default:
                return null;         }

        return { title, message, color };
    }

    async renderGameCanvas(showDealerHidden = true, player) {
        const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        const ctx = canvas.getContext('2d');
        const cardImages = await loadCardImagesOnce();

        const bgImage = await loadImage(path.join(__dirname, '../../assets/cards/background.png'));
        const scale = Math.min(CANVAS_WIDTH / bgImage.width, CANVAS_HEIGHT / bgImage.height);
        const x = (CANVAS_WIDTH - bgImage.width * scale) / 2;
        const y = (CANVAS_HEIGHT - bgImage.height * scale) / 2;

        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

        ctx.font = 'bold 24px "Inter 24pt"';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';

        this.drawDealerHand(ctx, cardImages, showDealerHidden);
        this.drawPlayerHand(ctx, cardImages);

        ctx.font = 'bold 12px "Inter 24pt"';
        ctx.textAlign = 'right';

        if (showDealerHidden && this.gameStatus === 'active') {

            const visibleCardScore = this.calculateHandScore([this.dealerHand[0]]);
            ctx.fillText(`${visibleCardScore}`, CANVAS_WIDTH - 234, 70);
        } else {
            ctx.fillText(`${this.dealerScore}`, CANVAS_WIDTH - 234, 70);
        }

        ctx.fillText(`${this.playerScore}`, CANVAS_WIDTH - 229, 298);

        ctx.textAlign = 'left';
        ctx.font = 'bold 20px "Inter 24pt"';
        ctx.fillText(`${formatNumber(this.betAmount)}`, 43, 140);

        if (this.gameStatus !== 'active' && this.gameStatus !== 'stand') {
            const notificationInfo = this.getNotificationInfo();
            if (notificationInfo) {
                drawNotification(ctx, notificationInfo.title, notificationInfo.message, notificationInfo.color);
            }
        }

        return canvas;
    }


    drawDealerHand(ctx, cardImages, showHidden) {
        const baseX = 440;         const centerY = 90;
        const cardSpacing = 40; 
        if (this.dealerHand.length > 0) {
            for (let i = 0; i < this.dealerHand.length; i++) {
                const posX = baseX + (i * cardSpacing);

                ctx.save();

                const offsetY = i === 0 ? -10 : 0;

                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 5;

                if (i === 1 && showHidden && this.gameStatus === 'active') {

                    ctx.drawImage(cardImages[53], posX, centerY + offsetY, CARD_WIDTH, CARD_HEIGHT);
                } else {

                    const card = this.dealerHand[i];
                    const cardKey = `${card.value}_of_${card.suit}`;
                    const cardNumber = cardMapping[cardKey];
                    ctx.drawImage(cardImages[cardNumber], posX, centerY + offsetY, CARD_WIDTH, CARD_HEIGHT);
                }

                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }
    }

    drawPlayerHand(ctx, cardImages) {
        const baseX = 440;         const centerY = 315;
        const cardSpacing = 40; 
        if (this.playerHand.length > 0) {
            for (let i = 0; i < this.playerHand.length; i++) {
                const card = this.playerHand[i];
                const cardKey = `${card.value}_of_${card.suit}`;
                const cardNumber = cardMapping[cardKey];
                const posX = baseX + (i * cardSpacing);

                ctx.save();

                const offsetY = i === 0 ? -10 : 0;

                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 5;
                ctx.drawImage(cardImages[cardNumber], posX, centerY + offsetY, CARD_WIDTH, CARD_HEIGHT);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }
    }
}

async function getOrCreatePlayer(userId, guildId, client) {
    const [player] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: { coins: 0, banque: 0 }
    });
    return player;
}

function formatNumber(number) {
    return number.toLocaleString('fr-FR');
}

function createGameKey(guildId, userId) {
    return `${guildId}-${userId}`;
}

module.exports = {
    name: 'bj',
    description: "Partie de blackjack",
    aliases: ["blackjack"],
    usage: "<mise>",
    async execute(message, args, client) {
        if (!message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const gameKey = createGameKey(guildId, userId);

        let all = false;

        if (activeGames.has(gameKey)) {
            return simpleReply(message, "Vous avez déjà un jeu de Blackjack en cours! Terminez-le avant d'en commencer un autre.");
        }

        const waitingMessage = await message.reply("🃏 Préparation de votre partie de Blackjack...");

        if (args[0] === "all") {
            all = true;
        } else if (!args[0] || isNaN(args[0]) || parseInt(args[0]) <= 0) {
            await waitingMessage.delete().catch(() => { });
            return simpleReply(message, "Veuillez spécifier une mise valide. Exemple: `!bj 100`");
        };

        try {

            const player = await getOrCreatePlayer(userId, guildId, client);
            let betAmount = 0;
            if (all) {
                betAmount = player.coins
            } else {
                betAmount = parseInt(args[0]);
            }

            if (player.coins < betAmount) {
                await waitingMessage.delete().catch(() => { });
                return simpleReply(message, `Vous n'avez pas assez d'argent pour cette mise. Vous avez ${formatNumber(player.coins)} 💰`);
            }

            if (!cardImagesCache) {
                await loadCardImagesOnce();
            }

            const game = await new BlackjackGame().init();
            game.betAmount = betAmount;

            activeGames.set(gameKey, game);

            await player.decrement('coins', { by: betAmount });



            const buttons = [
                new ButtonBuilder()
                    .setCustomId(`hit_${gameKey}`)
                    .setEmoji("<:tirer:1370142658353172540>")
                    .setLabel('Tirer')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stand_${gameKey}`)
                    .setEmoji("<:rester:1370142660307845151>")
                    .setLabel('Rester')
                    .setStyle(ButtonStyle.Secondary)
            ];

            if (game.canDouble && game.playerHand.length === 2 && player.coins >= game.betAmount) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`double_${gameKey}`)
                        .setEmoji("💰")
                        .setLabel('Doubler')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            const actionRow = new ActionRowBuilder().addComponents(buttons);

            if (game.gameStatus === 'lose' && game.dealerScore === 21) {

                const canvas = await game.renderGameCanvas(false, message.author.username);
                const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

                await waitingMessage.delete().catch(() => { });

                const sentMessage = await message.reply({
                    content: "Le croupier a Blackjack!",
                    files: [attachment],
                    components: []
                });

                await handleGameEnd(message, userId, guildId, game, client);
                activeGames.delete(gameKey);
                return;
            }

            if (game.gameStatus === 'blackjack' || game.gameStatus === 'push') {

                const canvas = await game.renderGameCanvas(false, message.author.username);
                const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

                await waitingMessage.delete().catch(() => { });

                const sentMessage = await message.reply({
                    content: game.gameStatus === 'blackjack' ? "BLACKJACK!" : "Égalité!",
                    files: [attachment],
                    components: []
                });

                await handleGameEnd(message, userId, guildId, game, client);
                activeGames.delete(gameKey);
                return;
            }

            const canvas = await game.renderGameCanvas(true, message.author.username);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

            await waitingMessage.delete().catch(() => { });

            const sentMessage = await message.reply({
                files: [attachment],
                components: [actionRow]
            });

            const filter = i => i.user.id === userId && i.message.id === sentMessage.id;
            const collector = message.channel.createMessageComponentCollector({ filter, time: GAME_TIMEOUT });

           collector.on('collect', async interaction => {
    try {
        const game = activeGames.get(gameKey);
        if (!game) {
            console.log(`Jeu introuvable pour la clé: ${gameKey}`);
            return;
        }

        console.log(`Action reçue: ${interaction.customId}`); 
        await interaction.deferUpdate();

        if (interaction.customId === `hit_${gameKey}`) {
            game.playerHit();
            
            const canvas = await game.renderGameCanvas(true, message.author.username);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

            const newButtons = [
                new ButtonBuilder()
                    .setCustomId(`hit_${gameKey}`)
                    .setEmoji("<:tirer:1370142658353172540>")
                    .setLabel('Tirer')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stand_${gameKey}`)
                    .setEmoji("<:rester:1370142660307845151>")
                    .setLabel('Rester')
                    .setStyle(ButtonStyle.Secondary)
            ];
            
            const newActionRow = game.gameStatus === 'active' ? 
                new ActionRowBuilder().addComponents(newButtons) : null;

            await interaction.editReply({
                files: [attachment],
                components: newActionRow ? [newActionRow] : []
            });

            if (game.gameStatus !== 'active') {
                await handleGameEnd(message, userId, guildId, game, client);
                activeGames.delete(gameKey);
                collector.stop();
            }
        }
        else if (interaction.customId === `stand_${gameKey}`) {
            game.playerStand();
            
            const canvas = await game.renderGameCanvas(false, message.author.username);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

            await interaction.editReply({
                files: [attachment],
                components: []
            });

            await handleGameEnd(message, userId, guildId, game, client);
            activeGames.delete(gameKey);
            collector.stop();
        }
        else if (interaction.customId === `double_${gameKey}`) {
            console.log("Tentative de doubler..."); 
            if (!game.canDouble) {
                console.log("Impossible de doubler: canDouble = false");
                return;
            }
            
            if (game.hasDoubled) {
                console.log("Impossible de doubler: déjà doublé");
                return;
            }
            
            if (game.playerHand.length !== 2) {
                console.log(`Impossible de doubler: ${game.playerHand.length} cartes au lieu de 2`);
                return;
            }

            const currentPlayer = await getOrCreatePlayer(userId, guildId, client);
            console.log(`Coins du joueur: ${currentPlayer.coins}, Mise actuelle: ${game.betAmount}`);
            
            if (currentPlayer.coins < game.betAmount) {
                console.log("Pas assez d'argent pour doubler");

                await interaction.followUp({
                    content: "❌ Vous n'avez pas assez d'argent pour doubler votre mise !",
                    ephemeral: true
                });
                return;
            }

            console.log("Déduction de la mise supplémentaire...");

            await currentPlayer.decrement('coins', { by: game.betAmount });
            
            console.log("Exécution de playerDouble()...");

            game.playerDouble();
            
            console.log(`Nouvelle mise: ${game.betAmount}, Statut du jeu: ${game.gameStatus}`);
            
            const canvas = await game.renderGameCanvas(false, message.author.username);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

            await interaction.editReply({
                content: "🎲 Vous avez doublé votre mise !",
                files: [attachment],
                components: []
            });

            console.log("Traitement de fin de jeu...");
            await handleGameEnd(message, userId, guildId, game, client);
            activeGames.delete(gameKey);
            collector.stop();
        }
    } catch (error) {
        console.error("Erreur dans le collecteur:", error);

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Une erreur s'est produite lors du traitement de votre action.",
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: "❌ Une erreur s'est produite lors du traitement de votre action.",
                    ephemeral: true
                });
            }
        } catch (followUpError) {
            console.error("Erreur lors de l'envoi du message d'erreur:", followUpError);
        }
    }
});

            collector.on('end', async (_, reason) => {
                if (reason === 'time' && activeGames.has(gameKey)) {
                    const game = activeGames.get(gameKey);

                    game.playerStand();

                    const canvas = await game.renderGameCanvas(false, message.author.username);
                    const attachment = new AttachmentBuilder(canvas.toBuffer(), 'blackjack.png');

                    try {
                        await sentMessage.edit({
                            content: "⏱️ Temps écoulé ! Décision automatique : Rester",
                            files: [attachment],
                            components: []
                        });
                    } catch (err) {
                        console.error("Erreur lors de la mise à jour du message après timeout:", err);
                    }

                    await handleGameEnd(message, userId, guildId, game, client);
                    activeGames.delete(gameKey);
                }
            });

        } catch (error) {
            console.error("Erreur dans la commande blackjack:", error);
            await waitingMessage.delete().catch(() => { });
            simpleReply(message, "Une erreur s'est produite lors du lancement du jeu de Blackjack.");

            activeGames.delete(gameKey);
        }
    }
};

async function handleGameEnd(message, userId, guildId, game, client) {
    try {
        const player = await getOrCreatePlayer(userId, guildId, client);
        let winnings = 0;

        switch (game.gameStatus) {
            case 'win':
            case 'blackjack':
                winnings = Math.floor(game.betAmount * game.getWinMultiplier());
                await player.increment('coins', { by: winnings });
                break;
            case 'push':
                winnings = game.betAmount;
                await player.increment('coins', { by: winnings });
                break;

        }

    } catch (error) {
        console.error("Erreur lors du traitement de fin de jeu:", error);
        await simpleReply(message, "Une erreur s'est produite lors du traitement des gains.");
    }
}