const simpleReply = require('../../utils/simpleReply');
const checkCooldown = require('../../utils/cooldown');

module.exports = {
  name: 'work',
  description: "Travailler pour gagner des coins.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    const tasks = [
      'Farmer', 'Mineur', 'Forgeron', 'Charpentier', 'Pêcheur',
      'Bûcheron', 'Chasseur', 'Éleveur', 'Alchimiste', 'Apiculteur'
    ];
    const selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
    let earned = Math.floor(Math.random() * 401) + 100; // 100–500

    // Détermine si le joueur déclenche un travail spécial (1 chance sur 15)
    const isSpecial = Math.floor(Math.random() * 15) === 0;

    if (isSpecial) {
      earned *= 10;
    }

    try {
      const [player] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: {
          coins: 0,
          lastWorked: null,
          banque: 0
        }
      });

      const cooldownStatus = checkCooldown(player, 'lastWorked', 7200000); // 2h cooldown

      if (cooldownStatus.onCooldown) {
        return simpleReply(
          message,
          `⏳ **Repos nécessaire**\n\nTu dois te reposer avant de retravailler.\nTemps restant : **${cooldownStatus.timeLeft}**`
        );
      }

      player.lastWorked = new Date();
      player.coins += earned;
      await player.save();

      if (isSpecial) {
        return simpleReply(
          message,
          `🌟 **Travail Légendaire !**\n\nTu as accompli une tâche exceptionnelle en tant que \`${selectedTask}\` et tu remportes \`${earned.toLocaleString('fr-FR')}\` ${client.coins} !`
        );
      }

      return simpleReply(
        message,
        `🛠️ **Travail effectué**\n\nTu as travaillé comme \`${selectedTask}\` et gagné \`${earned.toLocaleString('fr-FR')}\` ${client.coins}`
      );

    } catch (error) {
      console.error("Erreur dans la commande work:", error);
      return simpleReply(message, `❌ **Erreur**\n\nUne erreur s'est produite pendant le travail.`);
    }
  }
};
