const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  name: 'lb',  
  description: "Affiche les leaderboards du serveur.",
  aliases: ["leaderboard", "top"],
  async execute(message, args, client) {
    const guildId = message.guild.id;

    const players = await client.models.Players.findAll({
      where: { guildId }
    });


    const teams = await client.models.Teams.findAll({
      where: { guildId }
    });


    const playersWithTotal = players.map(p => ({
      ...p.toJSON(),
      total: (p.coins || 0) + (p.banque || 0)
    }));
    

    let currentType = 'total';
    

    const generatePages = async (type) => {
      currentType = type;
      const pageSize = 10;
      const pages = [];
      
      if (type === 'team') {
    
        const sortedTeams = [...teams].sort((a, b) => b.balance - a.balance);
        
        if (!sortedTeams.length) {
          return [{
            embed: new EmbedBuilder()
              .setTitle(`🏆 Classement des équipes`)
              .setDescription("Aucune équipe n'a été créée sur ce serveur.")
              .setColor(0x2f3136)
              .setFooter({ text: `Page 1/1` }),
            canvas: null
          }];
        }

        for (let i = 0; i < sortedTeams.length; i += pageSize) {
          const chunk = sortedTeams.slice(i, i + pageSize);
          const leaderboard = await Promise.all(chunk.map(async (team, index) => {
            const rank = i + index + 1;
            const owner = await message.guild.members.fetch(team.ownerId).catch(() => null);
            const ownerName = owner ? `(${owner.user.username})` : '';
            return `\`${rank}.\` **${team.name}** ${ownerName} — \`${team.balance.toLocaleString('fr-FR')}\` ${client.coins}`;
          }));

          const embed = new EmbedBuilder()
            .setTitle(`🏆 Classement des équipes`)
            .setDescription(leaderboard.join('\n'))
            .setColor(0x2f3136)
            .setFooter({ text: `Page ${Math.floor(i / pageSize) + 1}/${Math.ceil(sortedTeams.length / pageSize)}` });

          const canvasData = await createTop3Canvas(sortedTeams.slice(0, 3), 'team', message, client);
          
          pages.push({
            embed,
            canvas: canvasData
          });
        }
      } else {

        let sortedPlayers;
        let title;
        
        switch(type) {
          case 'coins':
            sortedPlayers = [...playersWithTotal].sort((a, b) => b.coins - a.coins).filter(p => p.coins > 0);
            title = `🏆 Classement des joueurs (Coins)`;
            break;
          case 'banque':
            sortedPlayers = [...playersWithTotal].sort((a, b) => b.banque - a.banque).filter(p => p.banque > 0);
            title = `🏆 Classement des joueurs (Banque)`;
            break;
          case 'total':
          default:
            sortedPlayers = [...playersWithTotal].sort((a, b) => b.total - a.total).filter(p => p.total > 0);
            title = `🏆 Classement des joueurs (Total)`;
            break;
        }
        
        if (!sortedPlayers.length) {
          return [{
            embed: new EmbedBuilder()
              .setTitle(title)
              .setDescription(`Aucun joueur avec des ${type === 'total' ? 'coins' : type} dans ce classement.`)
              .setColor(0x2f3136)
              .setFooter({ text: `Page 1/1` }),
            canvas: null
          }];
        }

        for (let i = 0; i < sortedPlayers.length; i += pageSize) {
          const chunk = sortedPlayers.slice(i, i + pageSize);
          const leaderboard = await Promise.all(chunk.map(async (p, index) => {
            const rank = i + index + 1;
            const member = await message.guild.members.fetch(p.userId).catch(() => null);
            const username = member?.user.tag || "Utilisateur inconnu";
            
            let value;
            switch(type) {
              case 'coins': value = p.coins || 0; break;
              case 'banque': value = p.banque || 0; break;
              default: value = p.total; break;
            }
            
            return `\`${rank}.\` **${username}** — \`${value.toLocaleString('fr-FR')}\` ${client.coins}`;
          }));

          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(leaderboard.join('\n'))
            .setColor(0x2f3136)
            .setFooter({ text: `Page ${Math.floor(i / pageSize) + 1}/${Math.ceil(sortedPlayers.length / pageSize)}` });


          const canvasData = await createTop3Canvas(sortedPlayers.slice(0, 3), type, message, client);
          
          pages.push({
            embed,
            canvas: canvasData
          });
        }
      }
      
      return pages;
    };

    async function createTop3Canvas(items, type, message, client) {
      if (!items.length) return null;
      
      const canvas = createCanvas(500, 250);
      const ctx = canvas.getContext('2d');


      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#202225');
      gradient.addColorStop(1, '#2f3136');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      const podiums = [
        { x: 200, height: 110, label: '#1' },
        { x: 80,  height: 80,  label: '#2' },
        { x: 320, height: 60,  label: '#3' },
      ];

      for (let i = 0; i < Math.min(3, items.length); i++) {
        const { x, height, label } = podiums[i];
        const item = items[i];


        ctx.fillStyle = '#3a3c40';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - height, 100, height, 15);
        ctx.fill();
        ctx.shadowBlur = 0;


        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + 50, canvas.height - height + 35);

        let avatarURL, name, value;
        
        if (type === 'team') {

          const owner = await message.guild.members.fetch(item.ownerId).catch(() => null);
          avatarURL = owner?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
          name = item.name;
          value = item.balance;
        } else {

          const user = await message.guild.members.fetch(item.userId).catch(() => null);
          avatarURL = user?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
          name = user?.user?.username || 'Inconnu';
          
          switch(type) {
            case 'coins': value = item.coins || 0; break;
            case 'banque': value = item.banque || 0; break;
            default: value = item.total; break;
          }
        }


        const avatar = await loadImage(avatarURL);
        const avatarSize = 60;
        const avatarX = x + 20;
        const avatarY = canvas.height - height - 70;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + 50, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(name.substring(0, 10) + (name.length > 10 ? '...' : ''), x + 50, canvas.height - 10);
        

        ctx.fillStyle = '#ffd700';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${value.toLocaleString('fr-FR')} ${client.coins.slice(0, 1)}`, x + 50, canvas.height - height + 55);
      }

      return { buffer: canvas.toBuffer(), name: `top3_${type}.png` };
    }


    let pages = await generatePages(currentType);
    let currentPage = 0;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_leaderboard')
      .setPlaceholder('Choisir un type de classement')
      .addOptions([
        { label: 'Total (Coins + Banque)', value: 'total', default: true },
        { label: 'Coins', value: 'coins' },
        { label: 'Banque', value: 'banque' },
        { label: 'Équipes', value: 'team' }
      ]);


    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev_lb')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next_lb')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
      );


    const selectRow = new ActionRowBuilder()
      .addComponents(selectMenu);


    const msg = await message.channel.send({
      embeds: [pages[currentPage].embed],
      components: [selectRow, buttons],
      files: pages[currentPage].canvas ? [{ 
        attachment: pages[currentPage].canvas.buffer, 
        name: pages[currentPage].canvas.name 
      }] : []
    });
  

    const filter = (i) => {
      return (
        ['prev_lb', 'next_lb', 'select_leaderboard'].includes(i.customId) && 
        i.user.id === message.author.id
      );
    };
    

    const collector = msg.createMessageComponentCollector({ 
      filter, 
      time: 120000 
    });


    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'prev_lb') {
          currentPage = (currentPage - 1 + pages.length) % pages.length;
          await i.update({
            embeds: [pages[currentPage].embed],
            components: [selectRow, buttons],
            files: pages[currentPage].canvas ? [{ 
              attachment: pages[currentPage].canvas.buffer, 
              name: pages[currentPage].canvas.name 
            }] : []
          });
        } else if (i.customId === 'next_lb') {
          currentPage = (currentPage + 1) % pages.length;
          await i.update({
            embeds: [pages[currentPage].embed],
            components: [selectRow, buttons],
            files: pages[currentPage].canvas ? [{ 
              attachment: pages[currentPage].canvas.buffer, 
              name: pages[currentPage].canvas.name 
            }] : []
          });
        } else if (i.customId === 'select_leaderboard') {
          const selectedType = i.values[0];
          currentPage = 0;
          pages = await generatePages(selectedType);
          

          const updatedSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_leaderboard')
            .setPlaceholder('Choisir un type de classement')
            .addOptions([
              { label: 'Total (Coins + Banque)', value: 'total', default: selectedType === 'total' },
              { label: 'Coins', value: 'coins', default: selectedType === 'coins' },
              { label: 'Banque', value: 'banque', default: selectedType === 'banque' },
              { label: 'Équipes', value: 'team', default: selectedType === 'team' }
            ]);
            
          const updatedSelectRow = new ActionRowBuilder()
            .addComponents(updatedSelectMenu);
            
          await i.update({
            embeds: [pages[currentPage].embed],
            components: [updatedSelectRow, buttons],
            files: pages[currentPage].canvas ? [{ 
              attachment: pages[currentPage].canvas.buffer, 
              name: pages[currentPage].canvas.name 
            }] : []
          });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du message:', error);
        await i.reply({ 
          content: 'Une erreur est survenue lors de la mise à jour du classement.', 
          ephemeral: true 
        });
      }
    });


    collector.on('end', () => {
      try {
        msg.edit({ components: [] }).catch(e => console.error('Impossible de supprimer les composants:', e));
      } catch (error) {
        console.error('Erreur lors de la suppression des composants:', error);
      }
    });
  }
};