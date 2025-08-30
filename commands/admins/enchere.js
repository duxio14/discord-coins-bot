const { 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType
  } = require('discord.js');
  const Canvas = require('canvas');
  const { registerFont } = require('canvas');
  const path = require('path');
  
  try {
    registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
      family: 'Inter 24pt', 
      weight: 'Bold'
    });
  } catch (error) {
    console.warn('⚠️ Impossible de charger les polices Roboto. Utilisation des polices par défaut.');
  }
  
  module.exports = {
    name: 'enchere',
    wlOnly: true,
    description: 'Crée une enchère pour un objet',
    
    async execute(message, args, client) {
      try {
        if (args.length < 3) {
          return message.reply('❌ Usage: .enchere [prix_initial] [durée] [nom_objet]\nExemple: .enchere 100 2h30m Épée légendaire');
        }

        const prixInitial = parseFloat(args[0]);
        if (isNaN(prixInitial) || prixInitial <= 0) {
          return message.reply('❌ Le prix initial doit être un nombre positif.');
        }
        
        const dureeStr = args[1];

        const nomObjet = args.slice(2).join(' ');
        if (!nomObjet) {
          return message.reply('❌ Veuillez spécifier le nom de l\'objet à mettre en enchère.');
        }
        
        const dureeMs = parseDuree(dureeStr);
        
        if (!dureeMs) {
          return message.reply('❌ Format de durée invalide. Utilisez des formats comme 2h, 30m, 1j, 2j12h, etc.');
        }
        
        if (dureeMs <= 0) {
          return message.reply('❌ La durée doit être positive');
        }

        const dateFin = new Date(Date.now() + dureeMs);
        
        const enchereState = {
          prixActuel: prixInitial,
          dernierEncherisseur: null,
          dernierEncherisseurId: null,
          dernierEncherisseurAvatar: null,
          dateFinTimestamp: dateFin.getTime(),
          participants: []
        };

        const enchereAttachment = await generateEnchereCanvas(nomObjet, enchereState, message.author, dateFin, '🪙');

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('encherir')
              .setLabel('Enchérir')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💰')
          );

        const replyMessage = await message.reply({ 
          files: [enchereAttachment], 
          components: [row]
        });

        const collector = replyMessage.createMessageComponentCollector({ 
          componentType: ComponentType.Button,
          time: dateFin.getTime() - Date.now()         });

        collector.on('collect', async buttonInteraction => {

          const modal = new ModalBuilder()
            .setCustomId('modal_enchere')
            .setTitle(`Enchère: ${nomObjet}`);

          const miseInput = new TextInputBuilder()
            .setCustomId('mise')
            .setLabel(`Montant (min: ${enchereState.prixActuel + 1})`)
            .setPlaceholder(`Entrez un montant supérieur à ${enchereState.prixActuel.toLocaleString('fr-FR')}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const firstActionRow = new ActionRowBuilder().addComponents(miseInput);
          modal.addComponents(firstActionRow);

          await buttonInteraction.showModal(modal);
          
          try {

            const modalSubmit = await buttonInteraction.awaitModalSubmit({
              time: 120000,
              filter: i => i.customId === 'modal_enchere' && i.user.id === buttonInteraction.user.id
            });

            const mise = Number(modalSubmit.fields.getTextInputValue('mise'));

            if (isNaN(mise) || mise <= enchereState.prixActuel) {
              return await modalSubmit.reply({ 
                content: `❌ Votre mise doit être supérieure à ${enchereState.prixActuel.toLocaleString('fr-FR')}`, 
                ephemeral: true 
              });
            }

            const userBalance = await getBalance(buttonInteraction.user.id, client);
            if (userBalance < mise) {
              return await modalSubmit.reply({ 
                content: `❌ Vous n'avez pas assez de fonds. Votre solde: ${userBalance.toLocaleString('fr-FR')} '🪙'}`, 
                ephemeral: true 
              });
            }

            enchereState.prixActuel = mise;
            enchereState.dernierEncherisseur = buttonInteraction.user.tag;
            enchereState.dernierEncherisseurId = buttonInteraction.user.id;
            enchereState.dernierEncherisseurAvatar = buttonInteraction.user.displayAvatarURL({ format: 'png', size: 128 });
            
            if (!enchereState.participants.some(p => p.id === buttonInteraction.user.id)) {
              enchereState.participants.push({
                id: buttonInteraction.user.id,
                tag: buttonInteraction.user.tag,
                avatar: buttonInteraction.user.displayAvatarURL({ format: 'png', size: 64 })
              });
            }

            const updatedAttachment = await generateEnchereCanvas(nomObjet, enchereState, message.author, dateFin, '🪙');

            await replyMessage.edit({ 
              files: [updatedAttachment], 
              components: [row] 
            });
            
            await modalSubmit.reply({ 
              content: `✅ Votre mise de ${mise.toLocaleString('fr-FR')} '🪙' pour ${nomObjet} a été enregistrée!`, 
              ephemeral: true 
            });
          } catch (error) {
            console.error('Erreur lors de la soumission du modal:', error);

          }
        });

        collector.on('end', async () => {

          const disabledRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('encherir_disabled')
                .setLabel('Enchère terminée')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏁')
                .setDisabled(true)
            );

          const finalAttachment = await generateFinalEnchereCanvas(nomObjet, enchereState, message.author, '🪙');

          await replyMessage.edit({ 
            files: [finalAttachment], 
            components: [disabledRow] 
          });

          if (enchereState.dernierEncherisseurId) {
            try {

              await debitBalance(enchereState.dernierEncherisseurId, enchereState.prixActuel, client, message);

              await message.channel.send({ 
                content: `🎉 Félicitations <@${enchereState.dernierEncherisseurId}>! Vous avez remporté l'enchère pour **${nomObjet}** avec une mise de **${enchereState.prixActuel}** coins!`,
              });
            } catch (error) {
              console.error('Erreur lors du traitement des fonds:', error);
              await message.channel.send({ 
                content: `⚠️ L'enchère pour **${nomObjet}** s'est terminée, mais une erreur s'est produite lors du traitement des fonds. Veuillez contacter un administrateur.` 
              });
            }
          } else {
            await message.channel.send({ 
              content: `⏱️ L'enchère pour **${nomObjet}** s'est terminée sans aucune mise.` 
            });
          }
        });
        
      } catch (error) {
        console.error('Erreur dans la commande enchere:', error);
        await message.reply('❌ Une erreur s\'est produite lors de la création de l\'enchère.');
      }
    }
  };
  
  async function generateEnchereCanvas(nomObjet, enchereState, createur, dateFin, coinEmoji) {
    const canvas = Canvas.createCanvas(800, 500);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2F3136';     ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#5865F2';     ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    ctx.fillStyle = '#5865F2';
    ctx.fillRect(4, 4, canvas.width - 8, 80);
    
    ctx.font = 'bold 36px "Inter 24pt"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`🔨 Enchère: ${nomObjet}`, canvas.width / 2, 55);
    
    ctx.fillStyle = '#FFA500';     ctx.font = 'bold 20px "Inter 24pt"';
    ctx.textAlign = 'center';
    ctx.fillText(`Date de fin: ${formatDate(dateFin)}`, canvas.width / 2, 110);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Inter 24pt"';
    ctx.textAlign = 'center';
    ctx.fillText(`Prix actuel: ${enchereState.prixActuel} ${coinEmoji}`, canvas.width / 2, 160);
    
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 180);
    ctx.lineTo(canvas.width - 50, 180);
    ctx.stroke();
    
    ctx.font = 'bold 24px "Inter 24pt"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Dernier enchérisseur:', 50, 220);
    
    if (enchereState.dernierEncherisseur) {

      try {
        if (enchereState.dernierEncherisseurAvatar) {
          const avatar = await Canvas.loadImage(enchereState.dernierEncherisseurAvatar);
          ctx.save();
          ctx.beginPath();
          ctx.arc(100, 260, 40, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, 60, 220, 80, 80);
          ctx.restore();
        }
        
        ctx.fillStyle = '#43B581';
        ctx.fillText(enchereState.dernierEncherisseur, 160, 270);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'avatar:', error);
        ctx.fillStyle = '#43B581';
        ctx.fillText(enchereState.dernierEncherisseur, 50, 260);
      }
    } else {
      ctx.fillStyle = '#99AAB5'; 
      ctx.fillText('Aucun enchérisseur pour le moment', 50, 260);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Inter 24pt"';
    ctx.fillText(`Participant${enchereState.participants.length > 1 ? "s" : ""} (${enchereState.participants.length}) :`, 50, 325);
    
    ctx.font = 'bold 18px "Inter 24pt"';
    if (enchereState.participants.length > 0) {
      let yPos = 350;
      for (let i = 0; i < Math.min(5, enchereState.participants.length); i++) {
        ctx.fillText(`• ${enchereState.participants[i].tag}`, 70, yPos);
        yPos += 30;
      }
      
      if (enchereState.participants.length > 5) {
        ctx.fillStyle = '#99AAB5';
        ctx.fillText(`+ ${enchereState.participants.length - 5} autres participants`, 70, yPos);
      }
    } else {
      ctx.fillStyle = '#99AAB5';
      ctx.fillText('Aucun participant pour le moment', 70, 350);
    }
    
    ctx.fillStyle = '#99AAB5';
    ctx.font = 'bold 16px "Inter 24pt"';
    ctx.textAlign = 'right';
    ctx.fillText(`Enchère créée par ${createur.tag}`, canvas.width - 50, canvas.height - 30);
    
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'enchere.png' });
    return attachment;
  }
  
  async function generateFinalEnchereCanvas(nomObjet, enchereState, createur, coinEmoji) {
    const canvas = Canvas.createCanvas(800, 500);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2F3136';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = enchereState.dernierEncherisseur ? '#43B581' : '#F04747';     ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    ctx.fillStyle = enchereState.dernierEncherisseur ? '#43B581' : '#F04747';
    ctx.fillRect(4, 4, canvas.width - 8, 80);

    ctx.font = 'bold 36px "Inter 24pt"';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 Enchère terminée: ${nomObjet}`, canvas.width / 2, 55);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Inter 24pt"';
    ctx.textAlign = 'center';
    
    if (enchereState.dernierEncherisseur) {
      ctx.fillText(`Vendu à ${enchereState.dernierEncherisseur}`, canvas.width / 2, 130);
      ctx.fillText(`pour ${enchereState.prixActuel} ${coinEmoji}`, canvas.width / 2, 170);

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 240, 50, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = '#FFA500'; 
      ctx.lineWidth = 5;
      ctx.stroke();

      try {
        if (enchereState.dernierEncherisseurAvatar) {
          const avatar = await Canvas.loadImage(enchereState.dernierEncherisseurAvatar);
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, 240, 40, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatar, canvas.width / 2 - 40, 200, 80, 80);
          ctx.restore();
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'avatar du gagnant:', error);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px "Inter 24pt"';
        ctx.fillText('🏆', canvas.width / 2, 255);
      }
    } else {
      ctx.fillText('Aucune offre n\'a été faite', canvas.width / 2, 150);

      ctx.font = 'bold 80px "Inter 24pt"';
      ctx.fillText('😔', canvas.width / 2, 240);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Inter 24pt"';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Résumé de l\'enchère', canvas.width / 2, 320);
    
    ctx.font = 'bold 18px "Inter 24pt"';
    ctx.fillText(`Prix initial: ${enchereState.prixActuel - (enchereState.dernierEncherisseur ? 1 : 0)} ${coinEmoji}`, canvas.width / 2, 350);
    ctx.fillText(`Nombre de participants: ${enchereState.participants.length}`, canvas.width / 2, 400);

    ctx.fillStyle = '#99AAB5';
    ctx.font = 'bold 16px "Inter 24pt"';
    ctx.textAlign = 'center';
    ctx.fillText(`Enchère créée par ${createur.tag}`, canvas.width / 2, canvas.height - 30);
    
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'enchere_terminee.png' });
    return attachment;
  }
  
  function parseDuree(dureeStr) {
    let dureeMs = 0;
    
    const joursMatch = dureeStr.match(/(\d+)j/);
    if (joursMatch) {
      dureeMs += parseInt(joursMatch[1], 10) * 24 * 60 * 60 * 1000;
    }
    
    const heuresMatch = dureeStr.match(/(\d+)h/);
    if (heuresMatch) {
      dureeMs += parseInt(heuresMatch[1], 10) * 60 * 60 * 1000;
    }
    
    const minutesMatch = dureeStr.match(/(\d+)m/);
    if (minutesMatch) {
      dureeMs += parseInt(minutesMatch[1], 10) * 60 * 1000;
    }
    
    if (dureeMs === 0 && /^\d+$/.test(dureeStr)) {
      dureeMs = parseInt(dureeStr, 10) * 60 * 1000; 
    }
    
    return dureeMs > 0 ? dureeMs : null;
  }
  
  function formatDate(date) {
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function applyFont(fontStr) {
    try {
      const size = fontStr.match(/\d+px/)[0];
      const family = fontStr.includes('Bold') ? 'Bold' : 'Bold';
      return `${size} "${family}"`;
    } catch (error) {
      return fontStr.replace(/Roboto-(Bold|Regular)/, 'sans-serif');
    }
  }

  async function getBalance(userId, client) {

    try {
      const user = await client.models.Players.findOne({ where: {userId: userId} });
      return user ? (user.coins + user.banque) : 0;
      
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      return 0;
    }
  }
  
  async function debitBalance(userId, amount, client, message) {

   const player = await client.models.Players.findOne({
    where: {
      userId: userId
    }
   })

   if(!player || (player.coins + player.banque) < amount){
    return message.channel.send("La gagnant n'a pas suffisement d'argent!");
   } else {
    if(player.coins >= amount){
      player.coins -= amount;
    } else {
      player.coins = 0;
      player.banque = (amount - player.coins);
    }
   }

   await player.save()
  }
  