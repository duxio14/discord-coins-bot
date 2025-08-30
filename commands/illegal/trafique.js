const { MessageEmbed, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');
const Canvas = require('canvas');
const path = require('path');
const drogueData = {
    "cannabis": {
        nom: "Cannabis",
        prixAchat: 800, 
        qualites: ["standard", "premium", "luxe"],
        multiplicateursQualite: {
            "standard": 1.0,
            "premium": 1.5,
            "luxe": 2.2
        },
        description: "La drogue la plus commune et accessible.",
        emoji: "🌿",
        risque: 1, 
        imageUrl: "cannabis.png"
    },
    "cocaine": {
        nom: "Cocaïne",
        prixAchat: 2500,
        qualites: ["coupée", "pure", "premium"],
        multiplicateursQualite: {
            "coupée": 1.0,
            "pure": 1.8,
            "premium": 2.5
        },
        description: "Populaire dans les quartiers riches et les boîtes de nuit.",
        emoji: "❄️",
        risque: 3,
        imageUrl: "cocaine.png"
    },
    "meth": {
        nom: "Méthamphétamine",
        prixAchat: 1800,
        qualites: ["standard", "blue", "crystal"],
        multiplicateursQualite: {
            "standard": 1.0,
            "blue": 1.6,
            "crystal": 2.3
        },
        description: "Haute dépendance, populaire dans certains quartiers défavorisés.",
        emoji: "💎",
        risque: 4,
        imageUrl: "meth.png"
    },
    "extasy": {
        nom: "Ecstasy",
        prixAchat: 1200,
        qualites: ["pilule", "mdma", "pure"],
        multiplicateursQualite: {
            "pilule": 1.0,
            "mdma": 1.5,
            "pure": 2.0
        },
        description: "Très demandée dans les soirées et festivals.",
        emoji: "💊",
        risque: 2,
        imageUrl: "extasy.png"
    },
    "lsd": {
        nom: "LSD",
        prixAchat: 3000,
        qualites: ["tabs", "gel", "liquide"],
        multiplicateursQualite: {
            "tabs": 1.0,
            "gel": 1.4,
            "liquide": 2.0
        },
        description: "Marché de niche, mais très rentable.",
        emoji: "🧪",
        risque: 2,
        imageUrl: "lsd.png"
    }
};
const quartiersData = {
    "riche": {
        nom: "Quartier des Affaires",
        clientele: 0.5, 
        preference: ["cocaine", "extasy", "lsd"],
        multiplicateurPrix: 1.5, 
        tolerancePrix: 0.4, 
        risque: 1.5, 
        police: 3, 
        description: "Quartier huppé avec beaucoup d'argent, mais surveillance accrue.",
        emoji: "🏢"
    },
    "fete": {
        nom: "Quartier Festif",
        clientele: 2.0,
        preference: ["extasy", "cocaine", "cannabis"],
        multiplicateurPrix: 1.2,
        tolerancePrix: 0.3,
        risque: 1.2,
        police: 2,
        description: "Boîtes de nuit et bars, forte demande pour certaines substances.",
        emoji: "🎭"
    },
    "universite": {
        nom: "Campus Universitaire",
        clientele: 1.8,
        preference: ["cannabis", "lsd", "extasy"],
        multiplicateurPrix: 0.9,
        tolerancePrix: 0.2,
        risque: 0.8,
        police: 1,
        description: "Beaucoup de clients, mais budget limité et préférences spécifiques.",
        emoji: "🎓"
    },
    "industriel": {
        nom: "Zone Industrielle",
        clientele: 0.7,
        preference: ["meth", "cannabis"],
        multiplicateurPrix: 0.7,
        tolerancePrix: 0.6,
        risque: 0.6,
        police: 1,
        description: "Peu de surveillance, mais clientèle limitée.",
        emoji: "🏭"
    },
    "banlieue": {
        nom: "Banlieue Défavorisée",
        clientele: 1.5,
        preference: ["meth", "cannabis", "cocaine"],
        multiplicateurPrix: 0.6,
        tolerancePrix: 0.7,
        risque: 1.0,
        police: 2,
        description: "Marché important mais compétitif et sensible aux prix.",
        emoji: "🏘️"
    }
};

const drogueAliases = {
    "cannabis": ["cannabis", "weed", "marijuana", "pot", "herbe"],
    "cocaine": ["cocaine", "cocaïne", "coke", "neige", "poudre", "blow"],
    "meth": ["meth", "méthamphétamine", "crystal", "ice", "tina"],
    "extasy": ["extasy", "ecstasy", "ecsta", "xtc", "mdma", "pilule", "pills"],
    "lsd": ["lsd", "acide", "acid", "buvard", "tabs"]
};
const quartierAliases = {
    "riche": ["riche", "quartier riche", "affaires", "quartier des affaires", "business", "centre"],
    "fete": ["fete", "fête", "festif", "quartier festif", "club", "boite", "boîte", "nightclub"],
    "universite": ["universite", "université", "campus", "fac", "études", "etudes"],
    "industriel": ["industriel", "zone industrielle", "usine", "factory", "entrepôt", "entrepot"],
    "banlieue": ["banlieue", "quartier", "hood", "défavorisé", "defavorise", "cité", "cite"]
};
function normalizeDrugName(input) {
    if (!input) return null;
    
    const lowercaseInput = input.toLowerCase().trim();
    for (const [drugId, aliases] of Object.entries(drogueAliases)) {
        if (aliases.includes(lowercaseInput)) {
            return drugId;
        }
    }
    return lowercaseInput;
}
function normalizeDistrictName(input) {
    if (!input) return null;
    
    const lowercaseInput = input.toLowerCase().trim();
    
    for (const [districtId, aliases] of Object.entries(quartierAliases)) {
        if (aliases.includes(lowercaseInput)) {
            return districtId;
        }
    }
    
    return lowercaseInput;
}
function calculateMarketMetrics() {
    const marketMetrics = {};

    Object.keys(quartiersData).forEach(quartierId => {
        const quartier = quartiersData[quartierId];
        marketMetrics[quartierId] = {};

        Object.keys(drogueData).forEach(drogueId => {
            const drogue = drogueData[drogueId];
            let demande = quartier.clientele;
            if (quartier.preference.includes(drogueId)) {
                const prefIndex = quartier.preference.indexOf(drogueId);
                const prefBonus = 1 + (0.3 * (3 - prefIndex)); 
                demande *= prefBonus;
            } else {
                demande *= 0.5; 
            }
            const prixRecommande = drogue.prixAchat * 1.5 * quartier.multiplicateurPrix;

            marketMetrics[quartierId][drogueId] = {
                demande: demande,
                prixRecommande: Math.round(prixRecommande),
                tolerancePrix: quartier.tolerancePrix,
                risque: quartier.risque * drogue.risque
            };
        });
    });

    return marketMetrics;
}
function calculateSaleProbability(marketData, prixVente, quantite) {
    const prixRecommande = marketData.prixRecommande;
    const prixRatio = prixVente / prixRecommande;
    let probability;

    if (prixRatio <= 0.7) {
        probability = 0.95;
    } else if (prixRatio <= 1.0) {
        probability = 0.8 - ((prixRatio - 0.7) / 0.3) * 0.15;
    } else {
        const tolerance = marketData.tolerancePrix;
        probability = 0.65 * Math.exp(-(prixRatio - 1) / tolerance);
    }
    if (quantite > 1) {
        probability *= Math.pow(0.95, quantite - 1);
    }
    return Math.max(0.05, Math.min(0.95, probability));
}
function calculateBustRisk(marketData, quantite) {
    const baseRisk = marketData.risque * 0.01; 
    const quantityRisk = Math.pow(1.2, quantite - 1) - 1;
    return Math.min(0.75, baseRisk + (baseRisk * quantityRisk));
}

module.exports = {
    name: 'trafic',
    description: 'Système de gestion pour les trafiquants de drogue.',
    async execute(message, args, client) {
        const userId = message.author.id;
        const guildId = message.guild.id;

        try {
            const player = await client.models.Players.findOne({ where: { userId, guildId } });

            if (!player) {
                return simpleReply(message, "❌ Vous n'êtes pas enregistré dans la base de données.");
            }
            if (player.illegalJob !== "trafiquant") {
                return simpleReply(message, "🕵️ Cette commande est réservée aux trafiquants. Vous n'avez pas ce métier.");
            }
            let inventory;
            if (!player.drugInventory) {
                inventory = {};
            } else {
                try {
                    inventory = JSON.parse(player.drugInventory);
                } catch (e) {
                    inventory = {};
                }
            }
            if (!args || args.length === 0) {
                return showTraficHelp(message);
            }

            const subcommand = args[0].toLowerCase();

            switch (subcommand) {
                case 'info':
                    return showDrugInfo(message);
                case 'buy':
                case 'achat':
                case 'acheter':
                    return handleDrugBuy(message, args.slice(1), player, inventory, client);
                case 'sell':
                case 'vente':
                case 'vendre':
                    return handleDrugSell(message, args.slice(1), player, inventory, client);
                case 'planque':
                case 'inventory':
                case 'inventaire':
                    return showInventory(message, player, inventory);
                default:
                    return simpleReply(message, "❌ Sous-commande inconnue. Utilisez `.trafic info`, `.trafic buy`, `.trafic sell`, ou `.trafic planque`.");
            }
        } catch (err) {
            console.error("Erreur dans la commande trafic:", err);
            return simpleReply(message, "❌ Une erreur est survenue lors de l'exécution de la commande.");
        }
    }
};
async function showTraficHelp(message) {
    const embed = {
        title: '🕵️ Système de Trafic',
        color: 0xe84393,
        description: '**Commandes disponibles:**',
        fields: [
            {
                name: '`.trafic info`',
                value: 'Voir les drogues disponibles et leurs prix'
            },
            {
                name: '`.trafic buy <drogue> <qualité> <quantité>`',
                value: 'Acheter de la marchandise auprès de votre fournisseur'
            },
            {
                name: '`.trafic sell <drogue> <qualité> <quantité> <prix> <quartier>`',
                value: 'Vendre votre marchandise dans un quartier'
            },
            {
                name: '`.trafic planque`',
                value: 'Voir votre inventaire de marchandises'
            }
        ],
        footer: {
            text: '⚠️ Activité à haut risque: des saisies et arrestations sont possibles'
        }
    };

    message.reply({ embeds: [embed] });
}
async function showDrugInfo(message) {
    const marketMetrics = calculateMarketMetrics();
    const fields = [];
    Object.keys(drogueData).forEach(drogueId => {
        const drogue = drogueData[drogueId];

        let qualitesText = drogue.qualites.map(q => {
            const multiplier = drogue.multiplicateursQualite[q];
            return `**${q}**: ${Math.round(drogue.prixAchat * multiplier)} coins/kg`;
        }).join(' | ');

        fields.push({
            name: `${drogue.emoji} ${drogue.nom}`,
            value: `💰 **${drogue.prixAchat}** coins/kg | 🔺 **Risque**: ${'⚠️'.repeat(drogue.risque)}\n${qualitesText}`
        });
    });
    fields.push({
        name: '📍 Quartiers',
        value: Object.keys(quartiersData).map(id => {
            const q = quartiersData[id];
            return `**${q.emoji} ${q.nom}** | Police: ${'👮'.repeat(q.police)}`;
        }).join('\n')
    });

    const embed = {
        title: '📦 Catalogue',
        color: 0xe84393,
        description: 'Produits disponibles et zones de vente',
        fields: fields,
        footer: {
            text: 'Utilisez .trafic buy <drogue> <qualité> <quantité> pour acheter'
        }
    };

    message.reply({ embeds: [embed] });
}
async function handleDrugBuy(message, args, player, inventory, client) {
    if (args.length < 3) {
        return simpleReply(message, "❌ Format incorrect. Utilisez `.trafic buy <drogue> <qualité> <quantité>`");
    }

    const drogueInput = args[0];
    const drogueId = normalizeDrugName(drogueInput);
    const qualite = args[1].toLowerCase();
    const quantite = parseInt(args[2]);
    if (!drogueData[drogueId]) {
        return simpleReply(message, `❌ Type de drogue inconnu: ${drogueInput}. Utilisez \`.trafic info\` pour voir les options disponibles.`);
    }

    const drogue = drogueData[drogueId];
    if (!drogue.qualites.includes(qualite)) {
        return simpleReply(message, `❌ Qualité invalide pour ${drogue.nom}. Options disponibles: ${drogue.qualites.join(', ')}`);
    }
    if (isNaN(quantite) || quantite <= 0) {
        return simpleReply(message, "❌ La quantité doit être un nombre positif.");
    }

    if (quantite > 10) {
        return simpleReply(message, "❌ Votre fournisseur ne peut pas vous vendre plus de 10kg à la fois.");
    }
    const prixUnitaire = drogue.prixAchat * drogue.multiplicateursQualite[qualite];
    const coutTotal = Math.round(prixUnitaire * quantite);
    if (player.balance < coutTotal) {
        return simpleReply(message, `❌ Fonds insuffisants. Coût: **${coutTotal}** coins | Votre solde: **${player.balance}** coins`);
    }
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_drug_buy')
                .setLabel(`Confirmer (${coutTotal} coins)`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_drug_buy')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    const riskChance = Math.random();
    const isBusted = riskChance < 0.05; 

    const confirmEmbed = {
        title: '🧾 Achat',
        color: 0xe84393,
        description: `**${quantite}kg** de **${drogue.nom}** (${qualite})\n**Prix total**: ${coutTotal} coins`,
        fields: [
            {
                name: '⚠️ Avertissement',
                value: 'Toute transaction comporte un risque de contrôle policier'
            }
        ]
    };

    const response = await message.reply({
        embeds: [confirmEmbed],
        components: [row]
    });
    const filter = i => i.customId.startsWith('confirm_drug_buy') || i.customId.startsWith('cancel_drug_buy');
    const collector = response.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: "❌ Vous ne pouvez pas interagir avec cette transaction.", ephemeral: true });
        }
        if (interaction.customId === 'confirm_drug_buy') {
            if (isBusted) {
                const fine = Math.round(coutTotal * 0.5);
                player.balance -= fine;
                await player.save();

                await interaction.update({
                    embeds: [{
                        title: '🚨 CONTRÔLE POLICIER',
                        color: 0xff0000,
                        description: `La police a intercepté votre transaction!`,
                        fields: [
                            { 
                                name: '💸 Sanctions', 
                                value: `**Amende**: ${fine} coins\n**Solde restant**: ${player.balance} coins` 
                            }
                        ]
                    }],
                    components: []
                });

                return;
            }
            player.balance -= coutTotal;
            const inventoryKey = `${drogueId}_${qualite}`;
            if (!inventory[inventoryKey]) {
                inventory[inventoryKey] = 0;
            }
            inventory[inventoryKey] += quantite;
            player.drugInventory = JSON.stringify(inventory);
            await player.save();

            await interaction.update({
                embeds: [{
                    title: '✅ Transaction réussie',
                    color: 0x00ff00,
                    description: `Vous avez acheté **${quantite}kg** de **${drogue.nom}** (${qualite})`,
                    fields: [
                        {
                            name: '📊 Récapitulatif',
                            value: `**Stock**: ${inventory[inventoryKey]}kg\n**Dépense**: ${coutTotal} coins\n**Solde**: ${player.balance} coins`
                        }
                    ]
                }],
                components: []
            });
        } else {
            await interaction.update({
                embeds: [{
                    title: '❌ Transaction annulée',
                    color: 0xff0000,
                    description: 'Vous avez annulé cet achat'
                }],
                components: []
            });
        }
    });
    collector.on('end', collected => {
        if (collected.size === 0) {
            response.edit({
                embeds: [{
                    title: '⏱️ Délai expiré',
                    color: 0xff0000,
                    description: 'La transaction a été annulée faute de réponse'
                }],
                components: []
            });
        }
    });
}
async function showInventory(message, player, inventory) {
    if (Object.keys(inventory).length === 0) {
        return simpleReply(message, "📦 Votre planque est vide. Utilisez `.trafic buy` pour acheter des marchandises.");
    }

    const fields = [];
    let totalValue = 0;

    Object.keys(inventory).forEach(key => {
        if (inventory[key] <= 0) return;

        const [drogueId, qualite] = key.split('_');
        const quantity = inventory[key];

        if (!drogueData[drogueId]) return;

        const drogue = drogueData[drogueId];
        const prixBase = drogue.prixAchat * drogue.multiplicateursQualite[qualite];
        const valeurTotale = Math.round(prixBase * quantity);
        totalValue += valeurTotale;

        fields.push({
            name: `${drogue.emoji} ${drogue.nom} (${qualite})`,
            value: `**Quantité**: ${quantity}kg\n**Valeur**: ${valeurTotale} coins\n**Prix conseillé**: ${Math.round(prixBase * 1.5)} coins/kg`
        });
    });

    const embed = {
        title: '📦 Votre Planque',
        color: 0xe84393,
        description: `**Valeur totale**: ${totalValue} coins`,
        fields: fields,
        footer: {
            text: 'Utilisez .trafic sell pour vendre'
        }
    };

    message.reply({ embeds: [embed] });
}
async function handleDrugSell(message, args, player, inventory, client) {
    if (args.length < 5) {
        return simpleReply(message, "❌ Format incorrect. Utilisez `.trafic sell <drogue> <qualité> <quantité> <prix> <quartier>`");
    }

    const drogueInput = args[0];
    const drogueId = normalizeDrugName(drogueInput);
    const qualite = args[1].toLowerCase();
    const quantite = parseInt(args[2]);
    const prix = parseInt(args[3]);
    const quartierId = normalizeDistrictName(args[4]);
    if (!drogueData[drogueId]) {
        return simpleReply(message, `❌ Type de drogue inconnu: ${drogueInput}. Utilisez \`.trafic info\` pour voir les options disponibles.`);
    }
    if (!quartiersData[quartierId]) {
        return simpleReply(message, `❌ Quartier inconnu: ${args[4]}. Utilisez \`.trafic info\` pour voir les quartiers disponibles.`);
    }

    const drogue = drogueData[drogueId];
    const quartier = quartiersData[quartierId];
    if (isNaN(quantite) || quantite <= 0) {
        return simpleReply(message, "❌ La quantité doit être un nombre positif.");
    }

    if (isNaN(prix) || prix <= 0) {
        return simpleReply(message, "❌ Le prix doit être un nombre positif.");
    }
    const inventoryKey = `${drogueId}_${qualite}`;
    if (!inventory[inventoryKey] || inventory[inventoryKey] < quantite) {
        return simpleReply(message, `❌ Stock insuffisant de ${drogue.nom} (${qualite}) dans votre planque.`);
    }
    const marketMetrics = calculateMarketMetrics();
    const marketData = marketMetrics[quartierId][drogueId];
    const saleProb = calculateSaleProbability(marketData, prix, quantite);
    const bustRisk = calculateBustRisk(marketData, quantite);
    const totalRevenue = prix * quantite;
    const baseCost = drogue.prixAchat * drogue.multiplicateursQualite[qualite] * quantite;
    const profit = totalRevenue - baseCost;
    const successRating = saleProb >= 0.7 ? "Élevée" : (saleProb >= 0.4 ? "Moyenne" : "Faible");
    const riskRating = bustRisk >= 0.3 ? "Élevé" : (bustRisk >= 0.15 ? "Moyen" : "Faible");

    const confirmEmbed = {
        title: '🕵️ Opération de vente',
        color: 0xe84393,
        description: `**${quantite}kg** de **${drogue.nom}** (${qualite})\n**Lieu**: ${quartier.emoji} ${quartier.nom}\n**Prix**: ${prix} coins/kg`,
        fields: [
            {
                name: '📊 Analyse',
                value: `**Prix recommandé**: ${marketData.prixRecommande} coins/kg\n**Chance de vente**: ${Math.round(saleProb * 100)}% (${successRating})\n**Risque**: ${Math.round(bustRisk * 100)}% (${riskRating})`
            },
            {
                name: '💰 Profit potentiel',
                value: `**Revenu**: ${totalRevenue} coins\n**Bénéfice**: ${Math.round(profit)} coins`
            }
        ]
    };
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_drug_sell')
                .setLabel('Lancer la vente')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('negotiate_drug_sell')
                .setLabel(`Ajuster au prix conseillé (${Math.round(marketData.prixRecommande)} coins)`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('cancel_drug_sell')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

    const response = await message.reply({
        embeds: [confirmEmbed],
        components: [row]
    });
    const filter = i => i.customId.startsWith('confirm_drug_sell') ||
        i.customId.startsWith('negotiate_drug_sell') ||
        i.customId.startsWith('cancel_drug_sell');

    const collector = response.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: "❌ Vous ne pouvez pas interagir avec cette opération.", ephemeral: true });
        }

        if (interaction.customId === 'confirm_drug_sell') {
            await processDrugSale(
                interaction,
                drogueId,
                qualite,
                quantite,
                prix,
                quartierId,
                saleProb,
                bustRisk,
                player,
                inventory
            );
        }
        else if (interaction.customId === 'negotiate_drug_sell') {
            await interaction.update({
                embeds: [confirmEmbed],
                components: []
            });
            const adjustedPrice = Math.round(marketData.prixRecommande);
            const adjustedSaleProb = calculateSaleProbability(marketData, adjustedPrice, quantite);
            const adjustedTotalRevenue = adjustedPrice * quantite;
            const adjustedProfit = adjustedTotalRevenue - baseCost;
            const adjustedEmbed = {
                title: '🕵️ Prix ajusté',
                color: 0xe84393,
                description: `**Nouveau prix**: ${adjustedPrice} coins/kg`,
                fields: [
                    {
                        name: '📊 Nouveaux paramètres',
                        value: `**Chance de vente**: ${Math.round(adjustedSaleProb * 100)}%\n**Revenu total**: ${adjustedTotalRevenue} coins\n**Bénéfice**: ${Math.round(adjustedProfit)} coins`
                    }
                ]
            };

            const adjustedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('adjusted_confirm_drug_sell')
                        .setLabel('Vendre au prix ajusté')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('adjusted_cancel_drug_sell')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Danger)
                );

            const adjustedResponse = await message.reply({
                embeds: [adjustedEmbed],
                components: [adjustedRow]
            });

            const adjustedFilter = i => i.customId.startsWith('adjusted_confirm_drug_sell') ||
                i.customId.startsWith('adjusted_cancel_drug_sell');

            const adjustedCollector = adjustedResponse.createMessageComponentCollector({
                filter: adjustedFilter,
                time: 30000,
                max: 1
            });
        

            adjustedCollector.on('collect', async adjustedInteraction => {
                if (adjustedInteraction.user.id !== message.author.id) {
                    return adjustedInteraction.reply({ content: "❌ Vous ne pouvez pas interagir avec cette opération.", ephemeral: true });
                }

                if (adjustedInteraction.customId === 'adjusted_confirm_drug_sell') {
                    await processDrugSale(
                        adjustedInteraction,
                        drogueId,
                        qualite,
                        quantite,
                        adjustedPrice,
                        quartierId,
                        adjustedSaleProb,
                        bustRisk,
                        player,
                        inventory
                    );
                } else {
                    await adjustedInteraction.update({
                        embeds: [{
                            title: '❌ Opération annulée',
                            color: 0xff0000,
                            description: 'Vous avez annulé cette vente.'
                        }],
                        components: []
                    });
                }
            });

            adjustedCollector.on('end', collected => {
                if (collected.size === 0) {
                    adjustedResponse.edit({
                        embeds: [{
                            title: '⏱️ Opération expirée',
                            color: 0xff0000,
                            description: 'Vous avez mis trop de temps à répondre. L\'opération a été annulée.'
                        }],
                        components: []
                    });
                }
            });
        }
        else {
            await interaction.update({
                embeds: [{
                    title: '❌ Opération annulée',
                    color: 0xff0000,
                    description: 'Vous avez annulé cette vente.'
                }],
                components: []
            });
        }
    });
    collector.on('end', collected => {
        if (collected.size === 0) {
            response.edit({
                embeds: [{
                    title: '⏱️ Opération expirée',
                    color: 0xff0000,
                    description: 'Vous avez mis trop de temps à répondre. L\'opération a été annulée.'
                }],
                components: []
            });
        }
    });
}
async function processDrugSale(interaction, drogueId, qualite, quantite, prix, quartierId, saleProb, bustRisk, player, inventory) {
    const drogue = drogueData[drogueId];
    const quartier = quartiersData[quartierId];
    const inventoryKey = `${drogueId}_${qualite}`;
    if (!inventory[inventoryKey] || inventory[inventoryKey] < quantite) {
        return interaction.update({
            embeds: [{
                title: '❌ Erreur d\'inventaire',
                color: 0xff0000,
                description: `Vous n'avez plus assez de ${drogue.nom} (${qualite}) dans votre planque.`
            }],
            components: []
        });
    }
    const bustRoll = Math.random();

    if (bustRoll < bustRisk) {
        const value = drogue.prixAchat * drogue.multiplicateursQualite[qualite] * quantite;
        const fine = Math.round(value * 1.5); 
        inventory[inventoryKey] -= quantite;
        player.drugInventory = JSON.stringify(inventory);
        player.balance -= Math.min(player.balance, fine); 
        await player.save();
        return interaction.update({
            embeds: [{
                title: '🚨 OPÉRATION INTERCEPTÉE PAR LA POLICE',
                color: 0xff0000,
                description: `Les forces de l'ordre vous ont pris en flagrant délit en train de vendre vos marchandises dans ${quartier.nom}!`,
                fields: [
                    {
                        name: 'Conséquences',
                        value: `**Amende**: ${fine} coins\n**Marchandise**: ${quantite}kg de ${drogue.nom} saisis\n**Nouvelle balance**: ${player.balance} coins`
                    },
                    {
                        name: '⚠️ Avertissement',
                        value: 'Votre activité est désormais sous surveillance accrue. Faites profil bas pendant un moment.'
                    }
                ]
            }],
            components: []
        });
    }
    const saleRoll = Math.random();

    if (saleRoll < saleProb) {
        const revenue = prix * quantite;
        inventory[inventoryKey] -= quantite;
        player.drugInventory = JSON.stringify(inventory);
        player.balance += revenue;
        await player.save();
        return interaction.update({
            embeds: [{
                title: '💰 Vente réussie',
                color: 0x00ff00,
                description: `Vous avez vendu ${quantite}kg de ${drogue.nom} (${qualite}) dans ${quartier.nom} pour ${revenue} coins.`,
                fields: [
                    {
                        name: 'Transaction',
                        value: `**Prix unitaire**: ${prix} coins/kg\n**Quantité**: ${quantite}kg\n**Total**: ${revenue} coins`
                    },
                    {
                        name: 'Votre planque',
                        value: `Il vous reste ${inventory[inventoryKey] || 0}kg de ${drogue.nom} (${qualite}).`
                    },
                    {
                        name: 'Balance',
                        value: `Nouvelle balance: ${player.balance} coins.`
                    }
                ]
            }],
            components: []
        });
    } else {
        inventory[inventoryKey] -= quantite;
        player.drugInventory = JSON.stringify(inventory);
        await player.save();
        
        return interaction.update({
            embeds: [{
                title: '❌ Échec de la vente',
                color: 0xffa500,
                description: `Vous n'avez pas réussi à vendre votre marchandise dans ${quartier.nom}, mais votre stock a été perdu.`,
                fields: [
                    {
                        name: 'Raisons possibles',
                        value: `- Prix trop élevé pour ce quartier\n- Faible demande pour ${drogue.nom}\n- Trop de concurrence\n- Quantité trop importante`
                    },
                    {
                        name: 'Conséquences',
                        value: `Vous avez perdu ${quantite}kg de ${drogue.nom} (${qualite}).\nIl vous reste ${inventory[inventoryKey] || 0}kg dans votre planque.`
                    },
                    {
                        name: 'Suggestions',
                        value: `- Essayez un autre quartier\n- Baissez votre prix\n- Vendez en plus petites quantités`
                    }
                ]
            }],
            components: []
        });
    }
}
