const simpleReply = require('../../utils/simpleReply');
const resolveMember = require("../../utils/resolveMember");
const checkCooldown = require('../../utils/cooldown');

module.exports = {
  name: 'rob',
  description: "Voler de l'argent à un joueur.",
  usage: "{user}",

  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const [robber, created] = await client.models.Players.findOrCreate({
        where: { userId, guildId },
        defaults: {
          coins: 0,
          lastGift: null,
          banque: 0,
          dette: 0
        }
      });

      const cooldownStatus = checkCooldown(robber, 'lastRob', 10800000); // 3 heures

      if (cooldownStatus.onCooldown) {
        return simpleReply(message, `⏰ **Vol indisponible**\n\nVous pourrez voler dans: \`${cooldownStatus.timeLeft}\``);
      }

      if (!args[0]) {
        return simpleReply(message, `❓ **Syntaxe invalide**\n\nUsage: \`${client.prefix}rob <@utilisateur>\``);
      }

      const target = await resolveMember(message, args);
      if (!target || target.id === message.author.id) {
        return simpleReply(message, `🙃 **Action impossible**\n\nVous ne pouvez pas vous voler vous-même.`);
      }

      if (target.bot) {
        return simpleReply(message, `🤖 **Cible invalide**\n\nVous ne pouvez pas voler un bot.`);
      }

      const victim = await client.models.Players.findOne({
        where: { userId: target.id, guildId }
      });

      if (!victim || victim.coins <= 0) {
        return simpleReply(message, `💸 **Cible sans argent**\n\n${target.user.username} n'a pas de quoi être volé.`);
      }

      const now = new Date();
      robber.lastRob = now;

      if (victim.protectionUntil && new Date(victim.protectionUntil) > now) {
        const timeLeftMs = new Date(victim.protectionUntil) - now;
        const minutesLeft = Math.ceil(timeLeftMs / 60000);
        return simpleReply(message, `🛡️ **Protection active**\n\n${target.user.username} est protégé pendant encore \`${minutesLeft} min\`.`);
      }

      const isThief = robber.illegalJob === "voleur";
      const successRate = Math.random();
      const threshold = isThief ? 0.85 : 0.7;

      if (successRate <= threshold) {
        const minPercent = isThief ? 30 : 20;
        const maxPercent = isThief ? 99 : 89;
        const randomPercent = Math.floor(Math.random() * (maxPercent - minPercent + 1)) + minPercent;
        let stolenAmount = Math.floor(victim.coins * (randomPercent / 100));

        if (stolenAmount <= 0) stolenAmount = 1;

        victim.coins -= stolenAmount;
        robber.coins += stolenAmount;

        await victim.save();
        await robber.save();

        return simpleReply(
          message,
          `🦹 **Vol réussi !**\n\nVous avez volé \`${stolenAmount.toLocaleString('fr-FR')}\` ${client.coins} à ${target.username}${isThief ? ` grâce à vos talents de voleur professionnel.` : `.`}`
        );
      } else {
        const finePercent = isThief ? 0.05 : 0.1;
        const fine = Math.floor(robber.coins * finePercent);

        if (fine > 0) {
          robber.coins -= fine;
          await robber.save();
          return simpleReply(
            message,
            `🚨 **Vol échoué !**\n\nVous avez été attrapé en tentant de voler ${target.username}.\nAmende infligée : \`${fine}\` ${client.coins}${isThief ? ` (réduite grâce à vos contacts).` : `.`}`
          );
        } else {
          await robber.save();
          return simpleReply(
            message,
            `😅 **Vol échoué !**\n\nVous avez été attrapé, mais comme vous êtes fauché, vous repartez avec un avertissement.`
          );
        }
      }
    } catch (error) {
      console.error("Erreur dans la commande rob:", error);
      return simpleReply(message, "Une erreur s'est produite lors du vol.");
    }
  }
};
