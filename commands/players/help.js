const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Affiche la liste des commandes ou les détails d\'une commande spécifique',
  usage: '[commande]',
  async execute(message, args, client) {
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = client.commands.get(commandName) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) {
        return message.reply('❌ Cette commande n\'existe pas.');
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`Commande: .${command.name}`)
        .addFields(
          { name: 'Description', value: command.description || 'Aucune description disponible' },
          { name: 'Utilisation', value: command.usage ? `.${command.name} ${command.usage}` : `.${command.name}` }
        );

      if (command.aliases && command.aliases.length) {
        embed.addFields({ name: 'Aliases', value: command.aliases.map(alias => `.${alias}`).join(', ') });
      }

      if (command.category) {
        const categoryLabels = {
          illegal: '💀 Illegal',
          games: '🎮 Jeux',
          metiers: '💼 Métiers',
          team: '🏠 Team',
          crypto: '📈 Crypto',
        };
        embed.addFields({ name: 'Catégorie', value: categoryLabels[command.category] || command.category });
      };

      if (command.category === "games") {
        embed.addFields({ name: 'Règles', value: command.rules });
      }

      return message.reply({ embeds: [embed] });
    }

    const categoryLabels = {
      main: "Menu Principal",
      illegal: '💀 Illegal',
      games: '🎮 Jeux',
      metiers: '💼 Métiers',
      team: '🏠 Team',
      crypto: '📈 Crypto',
    };

    const isWL = await client.models.WhitelistUser.findOne({
      where: {
        userId: message.author.id
      }
    })

    const categorizedCommands = {};
    client.commands.forEach(cmd => {
      const cat = cmd.category || 'autres';
      if (cat === 'admins' && !isWL) return;
      if (!categorizedCommands[cat]) categorizedCommands[cat] = [];
      categorizedCommands[cat].push(cmd);
    });
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('📚 Acceuil')
      .setDescription("Utilisez `.help <commande>` pour plus d'informations\n📘 **Nouveau ?** `/guide` pour bien débuter !\n\n**Plus vous serez actif**, __mieux__ vous serez récompensé !\n> 🎧 `1200` coins par heure de vocale\n> 💬 `10` coins par message\n-# 🎥 Streams et caméras offrent un **boost non négligeable**\n\n*Naviguez avec les boutons ⬅️ et ➡️ ou utilisez le menu déroulant*")

    const categories = Object.keys(categorizedCommands).map(cat => ({
      label: categoryLabels[cat] || `📂 ${cat}`,
      description: `Commandes ${categoryLabels[cat]?.split(' ')[1] || cat}`,
      value: cat,
    }));

    const embeds = {
      'welcome': welcomeEmbed
    };

    for (const [cat, commands] of Object.entries(categorizedCommands)) {
      const label = categoryLabels[cat] || `📂 ${cat}`;
      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(label)
        .setDescription(
          commands
            .map(cmd => {
              const usage = cmd.usage ? `\`${cmd.usage}\`` : "";
              return `• ${cmd.name} ${usage}\n-# ${cmd.description}`;
            })
            .join('\n') || '*Aucune commande disponible*'
        )
        .setFooter({ text: 'Conseils: Utilisez .help [commande] pour plus de détails sur une commande spécifique' });
      embeds[cat] = embed;
    }
    const categoryKeys = ['welcome', ...Object.keys(categorizedCommands)];
    let currentIndex = 0;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('Choisis une catégorie')
      .addOptions([
        {
          label: '📚 Accueil',
          description: 'Page d\'accueil du centre d\'aide',
          value: 'welcome'
        },
        ...Object.keys(categorizedCommands).map(cat => ({
          label: categoryLabels[cat] || `📂 ${cat}`,
          description: `Commandes ${categoryLabels[cat]?.split(' ')[1] || cat}`,
          value: cat,
        }))
      ]);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Secondary)
    );

    const rowMenu = new ActionRowBuilder().addComponents(selectMenu);

    const msg = await message.reply({
      embeds: [embeds[categoryKeys[currentIndex]]],
      components: [rowMenu, buttons],
    });

    const collector = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: '❌ Ce menu ne t\'est pas destiné.', ephemeral: true });

      if (i.customId === 'help_select') {
        const selected = i.values[0];
        currentIndex = categoryKeys.indexOf(selected);
        await i.update({ embeds: [embeds[selected]], components: [rowMenu, buttons] });
      } else if (i.customId === 'left') {
        currentIndex = (currentIndex - 1 + categoryKeys.length) % categoryKeys.length;
        await i.update({ embeds: [embeds[categoryKeys[currentIndex]]], components: [rowMenu, buttons] });
      } else if (i.customId === 'right') {
        currentIndex = (currentIndex + 1) % categoryKeys.length;
        await i.update({ embeds: [embeds[categoryKeys[currentIndex]]], components: [rowMenu, buttons] });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => { });
    });
  }
};