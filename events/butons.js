
const { handleInteraction } = require('../commands/games/pf');
const {StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder} = require("discord.js")
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {


        if(!interaction.isButton()) return;

     
        const dragonTigerCommand = client.commands.get('dragontiger');
        if (dragonTigerCommand && interaction.customId.startsWith('bet_')) {
            await dragonTigerCommand.handleButtonInteraction(interaction, client);
        }
  

        if (interaction.customId.startsWith('gift_')) {
            const [command, choice, userId] = interaction.customId.split('_');
            
            if (interaction.user.id !== userId) {
              return interaction.reply({ content: "❌ Ce n'est pas votre cadeau!", ephemeral: true });
            }
            
            const guildId = interaction.guild.id;
            const player = await client.models.Players.findOne({
              where: { userId, guildId }
            });
            
            if (!player) {
              return interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
            }

          }
        if (interaction.customId.split('_')[0] === 'dragon') {

            const dragonCommand = client.commands.get('dragon');
            if (dragonCommand) {
              dragonCommand.handleButton(interaction, client);
            }
          }

        if(interaction.isButton() || interaction.isModalSubmit()){
            if (interaction.customId.startsWith("pf_")) {
                return handleInteraction(interaction, client);
            }    
        }

        if (interaction.customId.startsWith('slot-reroll_')) {
            const slotCommand = client.commands.get('slot');
            
            if (slotCommand && typeof slotCommand.handleButton === 'function') {
              await slotCommand.handleButton(interaction, client);
            }
          }
        if (!interaction.isButton()) return;


        if(interaction.customId.split("_")[0] === "metier"){
            console.log(interaction.customId.split('_'))
            await interaction.deferUpdate()
            const [prefix, action, metierKeyOrUserId, userId] = interaction.customId.split('_');
        
            if (prefix !== 'metier') return;
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: "⛔ Ce bouton ne t'appartient pas.", ephemeral: true });
            }

                const metierKey = metierKeyOrUserId;
                const metierData = require('../commands/metiers/metierData');
            
                const data =
                    metierData.metierLegal[metierKey] ||
                    metierData.metierIllegal[metierKey];
            
                if (!data) {
                    return interaction.followUp({
                        content: "❌ Métier introuvable.",
                        ephemeral: true
                    });
                }
            
                const player = await client.models.Players.findOne({
                    where: { userId: interaction.user.id, guildId: interaction.guild.id }
                });
            
                if (!player) {
                    return interaction.followUp({ content: "Vous n'avez pas encore de compte.", ephemeral: true });
                }
            
                const isIllegal = !!metierData.metierIllegal[metierKey];
            
                if (isIllegal) {
                    if (player.illegalJob) {
                        return interaction.followUp({ content: "❌ Vous avez déjà un métier illégal. Quittez-le avant d'en choisir un autre.", ephemeral: true });
                    }
                } else {
                    if (player.legalJob) {
                        return interaction.followUp({ content: "❌ Vous avez déjà un métier légal. Faites `.job leave` pour le quitter.", ephemeral: true });
                    }
                }
            
                if (player.coins < data.prix) {
                    return interaction.followUp({ content: `❌ Il vous faut ${data.prix} coins pour devenir ${data.nom}.`, ephemeral: true });
                }
            
                player.coins -= data.prix;
            
                if (isIllegal) {
                    player.illegalJob = metierKey;
                    player.illegalJobSince = new Date();
                    player.illegalJobEarnings = 0;
                } else {
                    player.legalJob = metierKey;
                    player.legalJobSince = new Date();
                    player.legalJobEarnings = 0;
                }
            
                await player.save();
            
                return interaction.editReply({
                    content: `✅ Vous êtes maintenant **${data.nom}** (${isIllegal ? "illégal" : "légal"}) !`,
                    embeds: [],
                    components: []
                });
            
        }

        const { customId, user, guild } = interaction;

        if (customId.startsWith("gift_")) {
            const parts = customId.split("_");
            const targetId = parts[1];
            const giftNumber = parts[2];

            if (user.id !== targetId) return;

            const [player, created] = await client.models.Players.findOrCreate({
                where: { userId: user.id, guildId: guild.id },
                defaults: {
                    coins: 0,
                    lastGift: null,
                    banque: 0
                }
            });

            const reward = Math.floor(Math.random() * (500 - (-100) + 1)) + (-100);

            player.lastGift = new Date();
            player.coins += reward;
            await player.save();

            return interaction.message.edit({
                embeds: [
                    {
                        description: `Vous avez choisi le cadeau \`N°${giftNumber}\` et __${reward < 0 ? "perdu" : "gagné"}__ **${reward}** 💰!`,
                        image: {
                            url: reward < 0
                                ? "https://i.headtopics.com/images/2024/4/10/eurosport-fr/le-resume-video-de-la-defaite-du-psg-face-au-fc-ba-le-resume-video-de-la-defaite-du-psg-face-au-fc-ba-892794EB264C5A345679DFF9259B6551.webp"
                                : "https://st2.depositphotos.com/2885805/7155/v/950/depositphotos_71550187-stock-illustration-hand-holding-a-winner-trophy.jpg"
                        }
                    }
                ],
                components: []
            });
        }

        if (customId.startsWith('tedit_')) {
            const parts = customId.split("_");
            const targetId = parts[1];
            const action = parts[2];

            if (user.id !== targetId) {
                return interaction.reply({ content: "❌ Ce bouton n'est pas pour vous.", ephemeral: true });
            }

            const team = await client.models.Teams.findOne({
                where: { ownerId: user.id, guildId: guild.id }
            });

            if (!team) {
                return interaction.reply({ content: "❌ Vous n'avez pas de team à éditer.", ephemeral: true });
            }

            switch (action) {
                case 'nom':
                    await askAndUpdate(interaction, team, 'name', '✏️ Envoyez-moi le nouveau nom de la team :');
                    break;
                case 'limit':
                    await askAndUpdate(interaction, team, 'maxMembers', '✏️ Envoyez-moi la nouvelle limite de membres (nombre) :');
                    break;
                case 'password':
                    await askAndUpdate(interaction, team, 'password', '✏️ Envoyez-moi le nouveau mot de passe de la team :');
                    break;
                case 'cancel':
                    await interaction.message.delete();
                    await interaction.reply({ content: "❌ Édition annulée.", ephemeral: true });
                    break;
                default:
                    await interaction.reply({ content: "❓ Action inconnue.", ephemeral: true });
                    break;
            }
        }

        async function askAndUpdate(interaction, team, field, prompt) {
            await interaction.reply({ content: prompt, ephemeral: true });

            const filter = (m) => m.author.id === interaction.user.id;
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => { });

            if (!collected || collected.size === 0) {
                return interaction.followUp({ content: '⏳ Temps écoulé, modification annulée.', ephemeral: true });
            }

            const responseMessage = collected.first();
            const response = responseMessage.content.trim();

            if (field === 'maxMembers' && isNaN(response) || response < 2 || response > 10) {
                await responseMessage.delete().catch(() => { });
                return interaction.followUp({ content: '❌ La limite doit être un nombre compris entre 2 et 10.', ephemeral: true });
            }

            team[field] = field === 'maxMembers' ? parseInt(response) : response;
            await team.save();

            await responseMessage.delete().catch(() => { });

            const newEmbed = {
                title: `⚙️ Édition de la team`,
                description: `Voici les informations actuelles de ta team :`,
                color: 0x2F3136,
                fields: [
                    { name: "🏷️ Nom", value: `> **${team.name}**`, inline: false },
                    { name: "👥 Limite de membres", value: `> **${team.maxMembers} membres**`, inline: false },
                    { name: "🔒 Mot de passe", value: team.password ? `> ||**************||` : "> Aucun mot de passe", inline: false }
                ],
                footer: {
                    text: `Modification faite par ${interaction.user.username}`
                },
                timestamp: new Date()
            };

            await interaction.message.edit({ embeds: [newEmbed] }).catch(console.error);

            await interaction.followUp({ content: `✅ ${field === 'name' ? 'Nom' : field === 'maxMembers' ? 'Limite' : 'Mot de passe'} mis à jour !`, ephemeral: true });
        }

        if (interaction.customId.startsWith("kick_")) {
            await interaction.deferUpdate();
            const memberId = interaction.customId.split("_")[1];
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);

            if (!member) {
                return interaction.followUp({ content: "\`❌\` Impossible de récupérer ce membre.", ephemeral: true });
            }

            const memberDB = await client.models.TeamMembers.findOne({
                where: { userId: memberId }
            });

            if (!memberDB) {
                return interaction.followUp({ content: "❌ Ce membre n'appartient à aucune équipe.", ephemeral: true });
            }

            await client.models.TeamMembers.destroy({
                where: { userId: memberId }
            });

            await interaction.editReply({
                embeds: [{ description: `✅ \`${member.user.tag}\` a été **expulsé** de l'équipe.` }],
                components: [],
                ephemeral: true
            });
        }

        
        if (interaction.customId.startsWith("transfert_")) {
            await interaction.deferUpdate();
            const memberId = interaction.customId.split("_")[1];
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);

            if (!member) {
                return interaction.followUp({ content: "\`❌\` Impossible de récupérer ce membre.", ephemeral: true });
            }

            const memberDB = await client.models.TeamMembers.findOne({
                where: { userId: memberId }
            });

            if (!memberDB || memberDB.role !== "staff") {
                return interaction.followUp({ content: "❌ Ce membre n'appartient à aucune équipe ou n'est pas staff.", ephemeral: true });
            }

            await client.models.TeamMembers.update(
                { role: "owner" },
                { where: { userId: memberId } }
            );
            await client.models.TeamMembers.update(
                { role: "membre"},
                { where: { userId: interaction.user.id } }
            );

            await interaction.editReply({
                embeds: [{ description: `✅ \`${member.user.tag}\` est désormais **l'owner** de cette team.` }],
                components: [],
                ephemeral: true
            });
        }

    }
};
