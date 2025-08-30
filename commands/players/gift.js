const simpleReply = require('../../utils/simpleReply');
const checkCooldown = require('../../utils/cooldown');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'gift',
    description: "Tenter de gagner des coins !",
    async execute(message, args, client) {
        if (!message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const now = new Date();

        try {
            const [player, created] = await client.models.Players.findOrCreate({
                where: { userId, guildId },
                defaults: {
                    coins: 0,
                    lastGift: null,
                    banque: 0,
                    dette: 0
                }
            });

            const cooldownStatus = checkCooldown(player, 'lastGift', 7200000); // 2h

            if (!cooldownStatus.onCooldown) {
                const giftMessage = await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`🎁 Choisissez un cadeau !`)
                            .setDescription(`Cliquez sur l'un des trois coffrets pour recevoir une surprise...`)
                            .setFooter({ text: 'Temps limité pour choisir (30 secondes)' })
                            .setImage("https://cdn.discordapp.com/attachments/1366081548599693415/1368167022667763762/ChatGPT_Image_3_mai_2025_12_04_01.png?ex=68173c55&is=6815ead5&hm=fa925980f4d3974723557e18e032d6e96bc63784ee9cc0df0a789fbfd686f71f&")
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`gift_1_${userId}`)
                                .setLabel('🔴 Coffre 1')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`gift_2_${userId}`)
                                .setLabel('🔵 Coffre 2')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`gift_3_${userId}`)
                                .setLabel('🟢 Coffre 3')
                                .setStyle(ButtonStyle.Secondary)
                        )
                    ]
                });

                const collector = giftMessage.createMessageComponentCollector({
                    filter: i => i.user.id === userId && i.customId.startsWith('gift_'),
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async (interaction) => {
                    await interaction.deferUpdate();
                    const choice = interaction.customId.split('_')[1];
                    let resultMessage, color;

                    if (choice === '1') {
                        const reward = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
                        player.coins += reward;
                        resultMessage = `🎉 Tu as remporté : \`${reward.toLocaleString('fr-FR')}\` ${client.coins} !`;
                        color = '#2ecc71';
                    } else if (choice === '2') {
                        const reward = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
                        player.coins += reward;
                        resultMessage = `👍 Tu as gagné : \`${reward.toLocaleString('fr-FR')}\` ${client.coins}.`;
                        color = '#3498db';
                    } else if (choice === '3') {
                        const badLuck = Math.floor(Math.random() * (500 - 200 + 1)) + 200;

                        if (Math.random() < 0.5) {
                            if (player.coins >= badLuck) {
                                player.coins -= badLuck;
                                resultMessage = `😬 Tu as perdu : \`${badLuck}\` ${client.coins}.`;
                            } else {
                                const debtAmount = badLuck - player.coins;
                                player.dette += debtAmount;
                                player.coins = 0;
                                resultMessage = `💸 Tu as perdu tous tes coins et tu as une dette de \`${debtAmount.toLocaleString('fr-FR')}\` ${client.coins}.`;
                            }
                        } else {
                            player.dette += badLuck;
                            resultMessage = `☠️ Tu contractes une dette de \`${badLuck.toLocaleString('fr-FR')}\` ${client.coins}.`;
                        }
                        color = '#e74c3c';
                    }

                    player.lastGift = now;
                    await player.save();

                    const resultEmbed = new EmbedBuilder()
                        .setColor(color)
                        .setTitle(`🎁 Résultat du coffret`)
                        .setDescription(`**${message.author.tag}**\n${resultMessage}`)
                        .setFooter({ text: '⏰ Prochain cadeau disponible dans 2 heures' });

                    await giftMessage.edit({
                        embeds: [resultEmbed],
                        components: []
                    });
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#7f8c8d')
                            .setDescription(`⏳ ${message.author.tag} n'a pas choisi de cadeau à temps.`)
                            .setFooter({ text: 'Relance la commande pour réessayer.' });

                        await giftMessage.edit({
                            embeds: [timeoutEmbed],
                            components: []
                        });
                    }
                });

            } else {
                return simpleReply(message, `⏰ Vous pourrez ouvrir un autre cadeau dans : **${cooldownStatus.timeLeft}**`);
            }
        } catch (error) {
            console.error("Error in gift command:", error);
            return simpleReply(message, "❌ Une erreur s'est produite lors de l'ouverture des cadeaux.");
        }
    }
};
