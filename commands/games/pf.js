const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const { createCanvas } = Canvas;
const fs = require('fs');
const path = require('path');
const simpleReply = require('../../utils/simpleReply');

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const activeGames = new Map();

module.exports = {
    name: 'pf',
    aliases: ['pfa'],
    usage: "Admin",
    description: 'Lance un jeu de pile ou face automatique qui tourne en continu',
    wlOnly: true,
    async execute(message, args, client) {
        if (!message.guild) return;
        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const gameKey = `${guildId}-${channelId}`;
        if (activeGames.has(gameKey)) {
            return simpleReply(message, "❌ Un jeu de pile ou face automatique est déjà en cours dans ce salon!");
        }

        const embed = new EmbedBuilder()
            .setTitle('🎲 Pile ou Face Automatique 🎲')
            .setDescription('Un nouveau jeu de pile ou face va commencer!\nVous avez 15 secondes pour participer.')
            .setColor('#2c2f33')
            .setFooter({ text: 'Utilisez le bouton ci-dessous pour participer' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pf_participate')
                    .setLabel('Participer')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲')
            );

        const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });
        const gameData = {
            message: gameMessage,
            players: new Map(),
            active: true,
            countdown: 15,
            countdownInterval: null,
            timer: null
        };

        activeGames.set(gameKey, gameData);
        await startCountdown(gameKey, client);
    }
};

module.exports.stopGame = {
    name: 'pileouface-stop',
    aliases: ['pfastop'],
    description: 'Arrête le jeu de pile ou face automatique en cours',
    async execute(message, args, client) {
        if (!message.guild) return;
        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const gameKey = `${guildId}-${channelId}`;
        if (!activeGames.has(gameKey)) {
            return simpleReply(message, "❌ Aucun jeu de pile ou face automatique n'est en cours dans ce salon!");
        }

        const gameData = activeGames.get(gameKey);
        clearTimeout(gameData.timer);
        clearInterval(gameData.countdownInterval);

        const embed = new EmbedBuilder()
            .setTitle('🎲 Pile ou Face Automatique 🎲')
            .setDescription('Le jeu a été arrêté par un administrateur.')
            .setColor('#FF0000');

        await gameData.message.edit({ embeds: [embed], components: [] });
        activeGames.delete(gameKey);
        return simpleReply(message, "✅ Jeu de pile ou face automatique arrêté avec succès!");
    }
};

async function startCountdown(gameKey, client) {
    const gameData = activeGames.get(gameKey);
    if (!gameData) return;
    gameData.countdown = 15;
    await updateCountdownMessage(gameKey);

    gameData.countdownInterval = setInterval(async () => {
        gameData.countdown--;
        await updateCountdownMessage(gameKey);
        if (gameData.countdown <= 0) {
            clearInterval(gameData.countdownInterval);
            await runGame(gameKey, client);
        }
    }, 1000);
}

async function updateCountdownMessage(gameKey) {
    const gameData = activeGames.get(gameKey);
    if (!gameData) return;

    const playersText = gameData.players.size > 0 
        ? Array.from(gameData.players.values())
            .map(player => `<@${player.user.id}> (\`${player.betAmount}\` 💰 sur \`${player.choice.toUpperCase()}\`)`)
            .join('\n')
        : "Aucun participant pour l'instant";

    const embed = new EmbedBuilder()
        .setTitle('🎲 Pile ou Face Automatique 🎲')
        .setDescription(`Un nouveau jeu commencera dans **${gameData.countdown}** secondes!\n\n**Participants:**\n${playersText}`)
        .setColor('#2c2f33')
        .setFooter({ text: 'Utilisez le bouton ci-dessous pour participer' });

    try {
        await gameData.message.edit({ embeds: [embed] });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du message:", error);
    }
}

async function createResultCanvasImage(result, winners, losers) {
    const width = 700;
    const lineHeight = 40;
    const headerHeight = 100;
    const totalHeight = headerHeight + (winners.length + losers.length) * lineHeight;

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`🎯 Résultat : ${result.toUpperCase()}`, 30, 40);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#43b581';
    ctx.fillText('✅ Gagnants', 30, 80);

    ctx.fillStyle = '#f04747';
    ctx.fillText('❌ Perdants', 380, 80);

    ctx.font = '18px sans-serif';
    let y = 110;
    winners.forEach(w => {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${w.user.tag} | Mise: ${w.mise} | Gain: +${w.gain}`, 30, y);
        y += lineHeight;
    });

    y = 110;
    losers.forEach(l => {
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`${l.user.tag} | Mise: ${l.mise} | Perte: -${l.mise}`, 380, y);
        y += lineHeight;
    });

    return canvas.toBuffer('image/png');
}

async function runGame(gameKey, client) {
    const gameData = activeGames.get(gameKey);
    if (!gameData) return;

    const disabledRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pf_participate')
                .setLabel('Partie en cours...')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎲')
                .setDisabled(true)
        );

    await gameData.message.edit({ components: [disabledRow] });

    const result = Math.random() < 0.5 ? 'pile' : 'face';
    const winners = [];
    const losers = [];

    for (const [userId, playerData] of gameData.players) {
        const win = playerData.choice.toLowerCase() === result;
        const gainCoins = win ? playerData.betAmount : -playerData.betAmount;

        await playerData.playerData.update({
            coins: playerData.playerData.coins + gainCoins
        });

        if (win) {
            winners.push({
                user: playerData.user,
                mise: playerData.betAmount,
                gain: gainCoins
            });
        } else {
            losers.push({
                user: playerData.user,
                mise: playerData.betAmount
            });
        }
    }

    const buffer = await createResultCanvasImage(result, winners, losers);
    const attachment = new AttachmentBuilder(buffer, { name: 'canvas_result.png' });

    const resultEmbed = new EmbedBuilder()
        .setTitle(`🎲 Résultat: ${result.toUpperCase()}`)
        .setDescription('Résultats affichés ci-dessous. Une nouvelle partie commencera dans 15 secondes.')
        .setImage('attachment://canvas_result.png')
        .setColor(result === 'pile' ? '#FFD700' : '#C0C0C0');

    await gameData.message.edit({ embeds: [resultEmbed], files: [attachment], components: [] });

    gameData.players.clear();
    gameData.timer = setTimeout(async () => {
        const newEmbed = new EmbedBuilder()
            .setTitle('🎲 Pile ou Face Automatique 🎲')
            .setDescription('Un nouveau jeu va commencer!\n')
            .setColor('#2c2f33')
            .setFooter({ text: 'Utilisez le bouton ci-dessous pour participer' });

        const newRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pf_participate')
                    .setLabel('Participer')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲')
            );

        try {
            await gameData.message.edit({ embeds: [newEmbed], components: [newRow], files: [] });
            await startCountdown(gameKey, client);
        } catch (error) {
            console.error("Erreur lors du redémarrage du jeu:", error);
            activeGames.delete(gameKey);
        }
    }, 10000);
}

module.exports.handleInteraction = async (interaction, client) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const gameKey = `${guildId}-${channelId}`;
    if (!activeGames.has(gameKey)) return;
    const gameData = activeGames.get(gameKey);

    if (interaction.isButton() && interaction.customId === 'pf_participate') {
        if (gameData.players.has(interaction.user.id)) {
            return interaction.reply({ content: "❌ Vous participez déjà à cette partie!", ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('pf_bet_modal')
            .setTitle('Placer votre pari')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bet_amount')
                        .setLabel('Montant du pari')
                        .setPlaceholder('Entrez un nombre de coins')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bet_choice')
                        .setLabel('Votre choix')
                        .setPlaceholder('Entrez "pile" ou "face"')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                )
            );

        return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'pf_bet_modal') {
        const betAmount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
        let choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

        if (isNaN(betAmount) || betAmount <= 0) {
            return interaction.reply({ content: "❌ Veuillez spécifier un montant valide pour votre mise!", ephemeral: true });
        }

        if (!['pile', 'face', 'p', 'f'].includes(choice)) {
            return interaction.reply({ content: "❌ Choix invalide. Utilisez 'pile'/'p' ou 'face'/'f'.", ephemeral: true });
        }

        choice = choice === 'p' ? 'pile' : choice === 'f' ? 'face' : choice;

        const [playerData] = await client.models.Players.findOrCreate({
            where: {
                userId: interaction.user.id,
                guildId: interaction.guild.id
            },
            defaults: {
                coins: 0,
                banque: 0
            }
        });

        if (playerData.coins < betAmount) {
            return interaction.reply({ 
                content: `❌ Vous n'avez pas assez de coins! Solde actuel: \`${playerData.coins}\` 💰`, 
                ephemeral: true 
            });
        }

        gameData.players.set(interaction.user.id, {
            user: interaction.user,
            betAmount,
            choice,
            playerData
        });

        await interaction.reply({ 
            content: `✅ Vous participez avec un pari de \`${betAmount}\` 💰 sur \`${choice.toUpperCase()}\`!`, 
            ephemeral: true 
        });

        await updateCountdownMessage(gameKey);
    }
};
