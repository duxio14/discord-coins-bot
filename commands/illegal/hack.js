const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const checkCooldown = require('../../utils/cooldown');

module.exports = {
    name: 'hack',
    description: "Hacker un batiment.",
    async execute(message, args, client) {
        if (!message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const now = new Date();
        const coins = client.coins;

        const [player] = await client.models.Players.findOrCreate({
            where: { userId, guildId },
            defaults: {
                coins: 0,
                lastHack: null,
                dette: 0
            }
        });

        if (!player || player.illegalJob !== "hacker") {
            return simpleReply(message, `🚫 Tu n'es pas un hackeur !`);
        }

        const cooldownStatus = checkCooldown(player, 'lastHack', 1000 * 60 * 30); // 30 min

        if (cooldownStatus.onCooldown) {
            return simpleReply(message, `⏳ Tu dois attendre encore **${cooldownStatus.timeLeft}** avant de hacker à nouveau.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('💻 Hack en cours')
            .setDescription('Choisis ta cible à pirater :')
            .setColor('#2d3436')
            .addFields(
                { name: '👤 Utilisateur (facile)', value: 'Gain : `100–300` ' + coins + '\nRisque : Faible' },
                { name: '🏦 Banque (moyen)', value: 'Gain : `500–1000` ' + coins + '\nRisque : Moyen' },
                { name: '⚠️ Gouvernement (difficile)', value: 'Gain : `2000–5000` ' + coins + '\nRisque : Élevé' }
            );

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hack_user').setLabel('👤 Utilisateur').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('hack_bank').setLabel('🏦 Banque').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('hack_gov').setLabel('⚠️ Gouvernement').setStyle(ButtonStyle.Danger)
        );

        const sent = await message.channel.send({ embeds: [embed], components: [buttons] });

        const collector = sent.createMessageComponentCollector({
            time: 30000,
            filter: i => i.user.id === userId,
            max: 1
        });

        collector.on('collect', async i => {
            await i.deferUpdate();

            let gain = 0;
            let jailed = false;
            const outcome = Math.random();

            switch (i.customId) {
                case 'hack_user':
                    gain = outcome < 0.8 ? Math.floor(Math.random() * 201) + 100 : 0;
                    jailed = outcome > 0.9;
                    break;
                case 'hack_bank':
                    gain = outcome < 0.6 ? Math.floor(Math.random() * 501) + 500 : 0;
                    jailed = outcome > 0.75;
                    break;
                case 'hack_gov':
                    gain = outcome < 0.4 ? Math.floor(Math.random() * 3001) + 2000 : 0;
                    jailed = outcome > 0.6;
                    break;
            }

            const isCrit = Math.random() < 0.05;
            if (isCrit && gain > 0) gain *= 2;

            player.lastHack = now;

            let title, color, description;

            if (gain > 0) {
                player.coins += gain;
                title = '✅ Piratage réussi';
                color = '#27ae60';
                description = `Tu as volé \`${gain}\` ${coins} avec succès !`;
                if (isCrit) description += `\n💥 *Hack critique ! Tu as doublé ton butin.*`;
            } else if (jailed) {
                const amende = 2500;

                if (player.coins >= amende) {
                    player.coins -= amende;
                    title = '🚔 Tu as été attrapé !';
                    color = '#c0392b';
                    description = `Tu as payé une amende de \`${amende}\` ${coins}.`;
                } else {
                    const detteAjoutee = amende - player.coins;
                    player.dette += detteAjoutee;
                    player.coins = 0;
                    title = '🚔 Tu as été attrapé !';
                    color = '#c0392b';
                    description = `Tu étais trop pauvre et tu dois maintenant \`${detteAjoutee}\` ${coins} en **dette**.`;
                }
            } else {
                title = '❌ Piratage échoué';
                color = '#f1c40f';
                description = `Le piratage a échoué... mais tu n'as pas été attrapé.`;
            }

            await player.save();

            const resultEmbed = new EmbedBuilder()
                .setTitle(title)
                .setColor(color)
                .setDescription(description);

            await sent.edit({ embeds: [resultEmbed], components: [] });
        });
    }
};
