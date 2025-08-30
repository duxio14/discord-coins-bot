const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isStringSelectMenu()) return;

        const customId = interaction.customId;
        const userId = interaction.user.id


        if (customId.startsWith("metier_select")) {
            await interaction.deferUpdate();
        
            const [prefix, p, type, userId] = customId.split('_'); 
        
            if (interaction.user.id !== userId) {
                return interaction.followUp({
                    content: "⛔ Tu ne peux pas utiliser ce menu.",
                    ephemeral: true
                });
            }
        
            const metierKey = interaction.values[0];
            const metierData = require('../commands/metiers/metierData');
        
            const data = type === "legal"
                ? metierData.metierLegal[metierKey]
                : metierData.metierIllegal[metierKey];
        
            if (!data) {
                return interaction.followUp({
                    content: "❌ Métier introuvable.",
                    ephemeral: true
                });
            }
        
            const salaireNet = Math.floor(data.salaire * (1 - data.impot));
        
            const embed = new EmbedBuilder()
                .setTitle(`${data.nom}`)
                .setDescription(
                    `**💼 Prix de la formation :** ${data.prix} coins\n` +
                    `**💰 Salaire journalier brut :** ${data.salaire} coins\n` +
                    `**🧾 Impôts :** ${data.impot * 100}%\n` +
                    `**💸 Salaire net :** ${salaireNet} coins\n` + 
                    (data.description ? `✨ **Avantage :** ${data.description}` : "")
                )
                .setColor(0xf1c40f);
        
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`metier_${type}_${metierKey}_${userId}`) 
                    .setLabel("Choisir ce métier")
                    .setStyle(ButtonStyle.Success),
            );
        
            await interaction.followUp({
                embeds: [embed],
                components: [buttons],
                ephemeral: true
            });
        }
        
        
        if (customId.split("_")[0] === "protect") {
            const [prefix, action, userId] = interaction.customId.split('_');
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: "⛔ Tu ne peux pas utiliser ce menu.", ephemeral: true });
            }

            const value = interaction.values[0]; 
            const durationMap = {
                '1h': { ms: 1 * 60 * 60 * 1000, cost: 250 },
                '2h': { ms: 2 * 60 * 60 * 1000, cost: 400 },
                '6h': { ms: 6 * 60 * 60 * 1000, cost: 700 },
                '12h': { ms: 12 * 60 * 60 * 1000, cost: 1200 },
                '24h': { ms: 24 * 60 * 60 * 1000, cost: 2000 },
                '48h': { ms: 48 * 60 * 60 * 1000, cost: 3500 },
                '72h': { ms: 72 * 60 * 60 * 1000, cost: 5000 },
            };



            const choice = durationMap[value];

            if (choice === "promo") {
                await interaction.reply({
                    content: "En cours de développement...",
                    ephemeral: true
                })
            }
            const now = new Date();

            const player = await client.models.Players.findOne({
                where: { userId: interaction.user.id, guildId: interaction.guild.id }
            });

            if (!player) {
                return interaction.reply({ content: "Vous n'avez pas encore de compte !", ephemeral: true });
            }

            if (player.protectionUntil && player.protectionUntil > now) {
                const minutesLeft = Math.ceil((player.protectionUntil - now) / 60000);
                return interaction.reply({ content: `Vous êtes déjà protégé pendant encore ${minutesLeft} minute(s).`, ephemeral: true });
            }

            if (player.coins < choice.cost) {
                return interaction.reply({ content: `Vous avez besoin de **${choice.cost} coins** pour cette durée.`, ephemeral: true });
            }

            player.coins -= choice.cost;
            player.protectionUntil = new Date(now.getTime() + choice.ms);
            await player.save();

            return interaction.update({
                content: `🛡️ Vous êtes maintenant **protégé** pendant \`${value}\` !`,
                components: [],
                embeds: []
            });
        }
        if (customId === `tedit_${userId}_select_member`) {
            const selectedUserId = interaction.values[0];
            const member = await interaction.guild.members.fetch(selectedUserId).catch(() => null);

            if (!member) {
                return interaction.reply({ content: "\`❌\` Impossible de récupérer ce membre.", ephemeral: true });
            }

            const memberDB = await client.models.TeamMembers.findOne({
                where: { userId: member.user.id }
            });

            if (!memberDB) {
                return interaction.reply({ content: "\`❌\` Ce membre n'est plus dans votre équipe.", ephemeral: true });
            }

            const executor = await client.models.TeamMembers.findOne({
                where: { userId: userId }
            });

            if (!executor) return;

            const roleHierarchy = {
                "membre": 1,
                "ainé": 2,
                "staff": 3,
                "owner": 4
            };

            const roleOptions = [];
            let canKick = false;

            if (executor.role === "owner") {
                if (memberDB.role !== "membre") {

                    roleOptions.push({ label: `Membre ↓`, value: 'membre' });
                }
                if (memberDB.role !== "ainé") {

                    const direction = roleHierarchy[memberDB.role] < roleHierarchy["ainé"] ? "↑" : "↓";
                    roleOptions.push({ label: `Ainé ${direction}`, value: 'ainé' });
                }
                if (memberDB.role !== "staff") {

                    roleOptions.push({ label: `Staff ↑`, value: 'staff' });
                }
                canKick = true;
            } else if (executor.role === "staff") {
                if (memberDB.role !== "owner" && memberDB.role !== "staff") {
                    if (memberDB.role !== "membre") {
                        roleOptions.push({ label: `Membre ↓`, value: 'membre' });
                    }
                    if (memberDB.role !== "ainé") {
                        const direction = roleHierarchy[memberDB.role] < roleHierarchy["ainé"] ? "↑" : "↓";
                        roleOptions.push({ label: `Ainé ${direction}`, value: 'ainé' });
                    }
                    canKick = true;
                }
            }

            const components = [];

            if (roleOptions.length > 0 && memberDB.role !== "owner") {
                const roleSelector = new StringSelectMenuBuilder()
                    .setCustomId(`change_${selectedUserId}`)
                    .setPlaceholder('Changer le rôle')
                    .addOptions(roleOptions);

                components.push(new ActionRowBuilder().addComponents(roleSelector));
            }

            const actionButtons = [];

            if (executor.role === "owner" && memberDB.role === "staff") {
                const transferButton = new ButtonBuilder()
                    .setCustomId(`transfert_${selectedUserId}`)
                    .setLabel('Donner la propriété')
                    .setStyle(ButtonStyle.Danger);

                actionButtons.push(transferButton);
            }

            if (canKick && memberDB.role !== "owner") {
                const kickButton = new ButtonBuilder()
                    .setCustomId(`kick_${selectedUserId}`)
                    .setLabel('Expulser')
                    .setStyle(ButtonStyle.Danger);

                actionButtons.push(kickButton);
            }

            if (actionButtons.length > 0) {
                components.push(new ActionRowBuilder().addComponents(actionButtons));
            }

            await interaction.reply({
                embeds: [{
                    description: `\`\`\`python\nTag : ${member.user.tag}\nID : ${member.user.id}\nRôle : ${memberDB.role}\`\`\``
                }],
                components: components,
                ephemeral: true
            });
        }

        if (customId.startsWith(`change_`)) {
            await interaction.deferUpdate()
            const selectedUserId = customId.split("_")[1];
            const member = await interaction.guild.members.fetch(selectedUserId).catch(() => null);

            if (!member) {
                return interaction.reply({ content: "\`❌\` Impossible de récupérer ce membre.", ephemeral: true });
            }

            const role = interaction.values[0];

            await client.models.TeamMembers.update(
                { role: role },
                { where: { userId: selectedUserId } }
            );

            await interaction.editReply({
                embeds: [{
                    description: `Vous avez bien **modifié** le rôle de \`${member.user.tag}\` (${role})`
                }],
                components: []
            });
        }
    }
}

