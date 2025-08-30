const simpleReply = require('../utils/simpleReply')
module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId.startsWith('modal_pay_debt_')) {
      await interaction.deferReply({ ephemeral: true });
      
      const userId = interaction.customId.split('_').pop();
      const guildId = interaction.guild.id;
      
      if (interaction.user.id !== userId) {
        return interaction.followUp({ content: "❌ Tu ne peux pas utiliser cette interaction.", ephemeral: true });
      }
      
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });
      
      if (!player) {
        return interaction.followUp({ content: "❌ Une erreur est survenue.", ephemeral: true });
      }

      const amount = parseInt(interaction.fields.getTextInputValue('amount_to_pay'));
      if (isNaN(amount) || amount <= 0) {
        return interaction.followUp({ content: "❌ Montant invalide.", ephemeral: true });
      }

      if (amount > player.coins) {
        return interaction.followUp({ content: "❌ Tu n'as pas assez de coins.", ephemeral: true });
      }

      const paid = Math.min(amount, player.dette);
      player.coins -= paid;
      player.dette -= paid;
      await player.save();

      return interaction.followUp({ 
        content: `✅ Tu as remboursé **${paid} coins**. Dette restante : **${player.dette} coins**.`, 
        ephemeral: true 
      });
    }
    
        const dragonTigerCommand = client.commands.get('dragontiger');
        if (dragonTigerCommand && interaction.customId.startsWith('bet_modal_')) {
            await dragonTigerCommand.handleModalInteraction(interaction, client);
        }
    
    if (interaction.customId.startsWith('modal_take_loan_')) {
      await interaction.deferReply({ ephemeral: true });
      
      const userId = interaction.customId.split('_').pop();
      const guildId = interaction.guild.id;
      
      if (interaction.user.id !== userId) {
        return interaction.followUp({ content: "❌ Tu ne peux pas utiliser cette interaction.", ephemeral: true });
      }

      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });
      
      if (!player) {
        return interaction.followUp({ content: "❌ Une erreur est survenue.", ephemeral: true });
      }

      const amount = parseInt(interaction.fields.getTextInputValue('loan_amount'));
      if (isNaN(amount) || amount <= 0) {
        return interaction.followUp({ content: "❌ Montant invalide.", ephemeral: true });
      }

      if (player.dette + amount > 100000) {
        return interaction.followUp("Tu ne peux pas bg")
      }
      if (amount > 100000) {
        return interaction.followUp({ content: "❌ Le montant maximum est de 100000 coins.", ephemeral: true });
      }

      player.coins += amount;
      player.dette += amount;
      await player.save();

      return interaction.followUp({ 
        content: `✅ Tu as emprunté **${amount} coins**. Dette totale : **${player.dette} coins**.`, 
        ephemeral: true 
      });
    }
  
  if (interaction.customId === 'bet_modal') {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const betAmount = parseInt(interaction.fields.getTextInputValue('bet_amount_input'));

    if (isNaN(betAmount) || betAmount <= 0) {
      return interaction.reply({
        content: "Le montant doit être un nombre positif.",
        ephemeral: true
      });
    }

    try {
      const player = await client.models.Players.findOne({
        where: { userId, guildId }
      });

      if (!player) {
        return interaction.reply({
          content: "Vous n'avez pas de compte. Utilisez la commande `!start` pour commencer.",
          ephemeral: true
        });
      }

      if (player.coins < betAmount) {
        return interaction.reply({
          content: `Vous n'avez pas assez de coins. Il vous reste ${player.coins.toLocaleString()} coins.`,
          ephemeral: true
        });
      }

      const raceData = client.raceData[guildId];
      const selectedHorseIndex = raceData?.tempSelection?.[userId]?.horseIndex;

      if (selectedHorseIndex === undefined) {
        return interaction.reply({
          content: "Vous devez d'abord sélectionner un cheval.",
          ephemeral: true
        });
      }

      raceData.bets.set(userId, {
        horseIndex: selectedHorseIndex,
        amount: betAmount,
        username: interaction.user.username
      });

      await player.update({ coins: player.coins - betAmount });

      await interaction.reply({
        content: `✅ Pari confirmé : ${betAmount.toLocaleString()} coins sur ${raceData.horses[selectedHorseIndex].emoji} **${raceData.horses[selectedHorseIndex].name}**.`,
        ephemeral: true
      });


    } catch (error) {
      console.error("Erreur Modal Submit:", error);
      return interaction.reply({
        content: "Une erreur est survenue lors du traitement de votre pari.",
        ephemeral: true
      });
    }
  }
  }
};