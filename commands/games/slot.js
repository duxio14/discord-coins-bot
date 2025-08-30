const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const simpleReply = require('../../utils/simpleReply');

const config = {
  minBet: 50,                 maxBet: 10000000000,               defaultBet: 100,           symbols: [
  { name: '🍒', value: 1, chance: 50 },     { name: '🍋', value: 2, chance: 15 },     { name: '🍊', value: 3, chance: 15 },     { name: '🔔', value: 5, chance: 10 },     { name: '💎', value: 10, chance: 5 },     { name: '7️⃣', value: 20, chance: 3 },    { name: '💰', value: 50, chance: 1.5 },   { name: '🎰', value: 100, chance: 0.5 } ],

  winMultipliers: {
    twoSame: 2,                 threeSame: 5,               threeJackpot: 100         },

  spinDelay: 1000           };

const activeGames = new Set();

/**
 * Obtient un symbole aléatoire basé sur la distribution des chances
 * @returns {Object} Le symbole tiré au sort
 */
function getRandomSymbol() {
  const totalChance = config.symbols.reduce((acc, symbol) => acc + symbol.chance, 0);
  let random = Math.random() * totalChance;
  
  for (const symbol of config.symbols) {
    if (random < symbol.chance) {
      return symbol;
    }
    random -= symbol.chance;
  }

  return config.symbols[0];
}

/**
 * Génère des symboles aléatoires pour l'animation
 * @returns {string} Ligne de symboles aléatoires
 */
function generateRandomSymbols() {
  return [
    getRandomSymbol().name,
    getRandomSymbol().name,
    getRandomSymbol().name
  ].join(' | ');
}

/**
 * Vérifie les combinaisons gagnantes
 * @param {Array} reels - Les 3 symboles à vérifier
 * @returns {Object} Résultat du tirage
 */
function checkWin(reels) {

  const symbols = reels.map(reel => reel.name);
  const symbolValues = reels.map(reel => reel.value);

  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {

    if (symbols[0] === '🎰') {
      return {
        win: true,
        multiplier: config.winMultipliers.threeJackpot,
        type: 'JACKPOT SPÉCIAL! 🎉',
        baseValue: symbolValues[0],
        detailedMultiplier: `${symbols[0]} × ${config.winMultipliers.threeJackpot} = ×${config.winMultipliers.threeJackpot * symbolValues[0]}`
      };
    }

    return {
      win: true,
      multiplier: config.winMultipliers.threeSame,
      type: 'TRIPLE! 🎉',
      baseValue: symbolValues[0],
      detailedMultiplier: `${symbols[0]} (×${symbolValues[0]}) × Triple (×${config.winMultipliers.threeSame}) = ×${config.winMultipliers.threeSame * symbolValues[0]}`
    };
  }

  if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {

    let matchingSymbol;
    let baseValueIndex;
    
    if (symbols[0] === symbols[1]) {
      matchingSymbol = symbols[0];
      baseValueIndex = 0;
    } else if (symbols[1] === symbols[2]) {
      matchingSymbol = symbols[1];
      baseValueIndex = 1;
    } else {       matchingSymbol = symbols[0];
      baseValueIndex = 0;
    }

    const symbolConfig = config.symbols.find(s => s.name === matchingSymbol);
    
    return {
      win: true,
      multiplier: config.winMultipliers.twoSame,
      type: 'DOUBLE! 💰',
      baseValue: symbolValues[baseValueIndex],
      detailedMultiplier: `${matchingSymbol} (×${symbolConfig.value}) × Double (×${config.winMultipliers.twoSame}) = ×${config.winMultipliers.twoSame * symbolConfig.value}`
    };
  }

  return {
    win: false,
    multiplier: 0,
    type: 'Perdu 😢',
    baseValue: 0,
    detailedMultiplier: ''
  };
}

/**
 * Crée l'embed pour la machine à sous
 * @param {Object} options - Options pour l'embed
 * @returns {EmbedBuilder} L'embed créé
 */
function createSlotEmbed(options) {
  const { 
    title = "Machine à sous", 
    description = "Les rouleaux tournent...", 
    reelsDisplay = "🎮 | 🎮 | 🎮", 
    color = 0xf1c40f,
    extraFields = [],
    footer = null
  } = options;
  
  const embed = new EmbedBuilder()
    .setTitle(`🎰 ${title} 🎰`)
    .setDescription(description)
    .setColor(color)
    .addFields({ name: 'Rouleaux', value: `\`\`\`\n${reelsDisplay}\n\`\`\``, inline: false });

  extraFields.forEach(field => {
    embed.addFields(field);
  });

  if (footer) {
    embed.setFooter({ text: footer });
  }
  
  return embed;
}

/**
 * Gère l'animation et la logique de la machine à sous
 * @param {Number} bet - Montant misé
 * @param {Object} interaction - Interaction Discord.js
 * @param {Object} client - Client Discord.js
 * @param {Boolean} isReroll - Indique si c'est une relance
 * @returns {Promise<void>}
 */
async function playSlotMachine(bet, interaction, client, isReroll = false) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;

  activeGames.add(userId);
  
  try {

    const finalReels = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol()
    ];

    const initialEmbed = createSlotEmbed({
      title: "Machine à sous",
      description: `**Mise:** \`${bet}\` 💰\n\n*Les rouleaux tournent...*`,
      reelsDisplay: "❓ | ❓ | ❓",
      extraFields: [
        { name: 'État', value: 'Lancement...', inline: true },
        { name: 'Joueur', value: `<@${userId}>`, inline: true }
      ]
    });

    const initialRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('slot-reroll')
          .setLabel('Relancer')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎰')
          .setDisabled(true)
      );

    let message;
    if (isReroll) {

      await interaction.update({
        embeds: [initialEmbed],
        components: [initialRow]
      });
      message = await interaction.message;
    } else {

      message = await interaction.reply({
        embeds: [initialEmbed],
        components: [initialRow],
        fetchReply: true
      });
    }

    for (let step = 0; step < 3; step++) {

      const animReels = [
        getRandomSymbol().name,
        getRandomSymbol().name,
        getRandomSymbol().name
      ];
      
      const animEmbed = createSlotEmbed({
        title: "Machine à sous",
        description: `**Mise:** \`${bet}\` 💰\n\n*Les rouleaux tournent...*`,
        reelsDisplay: animReels.join(' | '),
        extraFields: [
          { name: 'État', value: 'Tous les rouleaux tournent...', inline: true },
          { name: 'Joueur', value: `<@${userId}>`, inline: true }
        ]
      });

      if (isReroll) {
        await interaction.editReply({
          embeds: [animEmbed],
          components: [initialRow]
        });
      } else {
        await interaction.editReply({
          embeds: [animEmbed],
          components: [initialRow]
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, config.spinDelay / 2));
    }

    for (let step = 0; step < 2; step++) {
      const animReels = [
        finalReels[0].name,         getRandomSymbol().name,
        getRandomSymbol().name
      ];
      
      const animEmbed = createSlotEmbed({
        title: "Machine à sous",
        description: `**Mise:** \`${bet}\` 💰\n\n*Deux rouleaux tournent encore...*`,
        reelsDisplay: animReels.join(' | '),
        extraFields: [
          { name: 'État', value: 'Premier rouleau fixé', inline: true },
          { name: 'Joueur', value: `<@${userId}>`, inline: true }
        ]
      });

      await interaction.editReply({
        embeds: [animEmbed],
        components: [initialRow]
      });
      
      await new Promise(resolve => setTimeout(resolve, config.spinDelay / 2));
    }

    for (let step = 0; step < 2; step++) {
      const animReels = [
        finalReels[0].name,         finalReels[1].name,         getRandomSymbol().name
      ];
      
      const animEmbed = createSlotEmbed({
        title: "Machine à sous",
        description: `**Mise:** \`${bet}\` 💰\n\n*Dernier rouleau tourne...*`,
        reelsDisplay: animReels.join(' | '),
        extraFields: [
          { name: 'État', value: 'Deux rouleaux fixés', inline: true },
          { name: 'Joueur', value: `<@${userId}>`, inline: true }
        ]
      });

      await interaction.editReply({
        embeds: [animEmbed],
        components: [initialRow]
      });
      
      await new Promise(resolve => setTimeout(resolve, config.spinDelay / 2));
    }

    const finalAnimEmbed = createSlotEmbed({
      title: "Machine à sous",
      description: `**Mise:** \`${bet}\` 💰\n\n*Tous les rouleaux sont arrêtés!*`,
      reelsDisplay: `${finalReels[0].name} | ${finalReels[1].name} | ${finalReels[2].name}`,
      extraFields: [
        { name: 'État', value: 'Calcul des gains...', inline: true },
        { name: 'Joueur', value: `<@${userId}>`, inline: true }
      ]
    });

    await interaction.editReply({
      embeds: [finalAnimEmbed],
      components: [initialRow]
    });
    
    await new Promise(resolve => setTimeout(resolve, config.spinDelay / 2));

    const result = checkWin(finalReels);

    let winAmount = 0;
    if (result.win) {
      winAmount = Math.floor(bet * result.multiplier * result.baseValue);
    }

    const netGain = winAmount - bet;

    const [player, created] = await client.models.Players.findOrCreate({
      where: {
        userId: userId,
        guildId: guildId
      },
      defaults: {
        coins: netGain
      }
    });

    if (!created) {
      player.coins += netGain;
      await player.save();
    }

    let resultDescription = `**Mise:** \`${bet}\` 💰\n\n`;
    
    if (result.win) {
      resultDescription += `**${result.type}**\n`;
      resultDescription += `Vous avez gagné: \`${winAmount}\` 💰\n`;
      resultDescription += `Gain net: \`${netGain > 0 ? '+' + netGain : netGain}\` 💰\n`;

      resultDescription += `\n**Détail du multiplicateur:**\n\`${result.detailedMultiplier}\`\n`;
    } else {
      resultDescription += `**${result.type}**\n`;
      resultDescription += `Vous avez perdu votre mise de \`${bet}\` 💰\n`;
    }
    
    resultDescription += `\nNouveau solde: \`${player.coins}\` 💰`;

    let finalColor;
    if (result.win) {
      if (finalReels[0].name === finalReels[1].name && finalReels[1].name === finalReels[2].name && finalReels[0].name === '🎰') {
        finalColor = 0xff0000;       } else {
        finalColor = 0x00ff00;       }
    } else {
      finalColor = 0x808080;     }

    const finalEmbed = createSlotEmbed({
      title: result.win ? "Vous avez gagné!" : "Vous avez perdu",
      description: resultDescription,
      reelsDisplay: `${finalReels[0].name} | ${finalReels[1].name} | ${finalReels[2].name}`,
      color: finalColor,
      extraFields: [
        { name: 'Résultat', value: result.type, inline: true },
        { name: 'Joueur', value: `<@${userId}>`, inline: true }
      ],
      footer: "Utilisez le bouton ci-dessous pour rejouer avec la même mise"
    });

    const finalRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`slot-reroll_${bet}_${userId}`)
          .setLabel('Relancer')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎰')
          .setDisabled(false)
      );

    await interaction.editReply({
      embeds: [finalEmbed],
      components: [finalRow]
    });
    
  } catch (error) {
    console.error("Erreur dans la machine à sous:", error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Erreur')
      .setDescription("Une erreur s'est produite lors de l'utilisation de la machine à sous.")
      .setColor(0xff0000);
    
    if (isReroll) {
      await interaction.update({
        embeds: [errorEmbed],
        components: []
      }).catch(() => {});
    } else {
      await interaction.editReply({
        embeds: [errorEmbed],
        components: []
      }).catch(() => {});
    }
  } finally {

    activeGames.delete(userId);
  }
}

module.exports = {
  name: 'slot',
  aliases: ['machine', 'slots'],
  usage: "<mise>",
  rules: `🎰 **Slot – Tente ta chance à la machine !**\n\nLance la machine à sous et aligne les bons symboles pour gagner.\nChaque combinaison a un **gain différent** selon sa rareté.\n\n- 💎 3 symboles identiques : **gros jackpot** !\n- 🍒 2 symboles identiques : **petit gain**.\n- ❌ Aucune combinaison : tu perds ta mise.\n\nLes rouleaux tournent... la chance décidera ! 🍀`,
  description: 'Tentez votre chance à la machine à sous!',


  async execute(message, args, client) {
    if (!message.guild) return;
    
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (activeGames.has(userId)) {
      return simpleReply(message, '⚠️ Vous avez déjà une partie de machine à sous en cours!');
    }
    
    try {

      let player = await client.models.Players.findOne({
        where: {
          userId: userId,
          guildId: guildId
        }
      });

      if (!player) {
        player = await client.models.Players.create({
          userId: userId,
          guildId: guildId,
          coins: 1000         });
      }

      let inputBet;
      let bet = config.defaultBet;
      if (args.length > 0) {
        if(args[0] === "all")inputBet = player.coins;
        else inputBet = parseInt(args[0]);

        if (!isNaN(inputBet) && inputBet > 0) {
          bet = Math.min(Math.max(inputBet, config.minBet), config.maxBet);
        } else {
          return simpleReply(message, `⚠️ Montant invalide! Veuillez entrer un nombre entre ${config.minBet} et ${config.maxBet}.`);
        }
      }

      if (player.coins < bet) {
        return simpleReply(message, `❌ Vous n'avez pas assez de coins! Vous avez \`${player.coins}\` 💰 mais vous avez besoin de \`${bet}\` 💰`);
      }

      const fakeInteraction = {
        user: message.author,
        guild: message.guild,
        message: null,
        reply: async (options) => {

          const sentMessage = await message.channel.send(options);
          fakeInteraction.message = sentMessage;
          options.fetchReply = true;
          return sentMessage;
        },
        editReply: async (options) => {

          if (!fakeInteraction.message) {
            fakeInteraction.message = await message.channel.send(options);
            return fakeInteraction.message;
          }
          return await fakeInteraction.message.edit(options);
        }
      };

      await playSlotMachine(bet, fakeInteraction, client);
      
    } catch (error) {
      console.error("Erreur dans la commande machine à sous:", error);
      await message.channel.send("❌ Une erreur s'est produite lors de l'utilisation de la machine à sous.");
    }
  },

  async handleButton(interaction, client) {

    const parts = interaction.customId.split('_');
    
    if (parts.length !== 3 || parts[0] !== 'slot-reroll') {
      return;
    }
    
    const bet = parseInt(parts[1]);
    const targetUserId = parts[2];

    if (interaction.user.id !== targetUserId) {
      return await interaction.reply({
        content: "❌ Seule la personne qui a lancé cette partie peut utiliser ce bouton.",
        ephemeral: true
      });
    }

    if (activeGames.has(interaction.user.id)) {
      return await interaction.reply({
        content: '⚠️ Vous avez déjà une partie de machine à sous en cours!',
        ephemeral: true
      });
    }
    
    try {

      const player = await client.models.Players.findOne({
        where: {
          userId: interaction.user.id,
          guildId: interaction.guild.id
        }
      });

      if (!player) {
        return await interaction.reply({
          content: "❌ Votre profil de joueur n'a pas été trouvé.",
          ephemeral: true
        });
      }

      if (player.coins < bet) {
        return await interaction.reply({
          content: `❌ Vous n'avez pas assez de coins! Vous avez \`${player.coins}\` 💰 mais vous avez besoin de \`${bet}\` 💰`,
          ephemeral: true
        });
      }

      await playSlotMachine(bet, interaction, client, true);
      
    } catch (error) {
      console.error("Erreur dans le gestionnaire de bouton machine à sous:", error);
      
      await interaction.reply({
        content: "❌ Une erreur s'est produite lors de l'utilisation de la machine à sous.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};