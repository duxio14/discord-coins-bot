const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'timer',
  description: "Affiche la liste de vos commandes disponibles.",
  usage: 'timer',
  async execute(message, args, client) {
    const { guild, author } = message;
    if (!guild) return;

    const userId = author.id;
    const guildId = guild.id;

    const cooldowns = {
      work: { label: 'work', dbField: 'lastWorked', delay: 60 * 60 * 1000 },             // 1h
      daily: { label: 'daily', dbField: 'lastDaily', delay: 24 * 60 * 60 * 1000 }, // 24h
      gift: { label: 'gift', dbField: 'lastGift', delay: 6 * 60 * 60 * 1000 },             // 6h
      rob: { label: 'rob', dbField: 'lastRob', delay: 3 * 60 * 60 * 1000 },                  // 3h
    };

    const player = await client.models.Players.findOne({ where: { userId, guildId } });
    if (!player) return simpleReply(message, "❌ Aucun profil trouvé.");

    // Ajouter le hack uniquement s'il a le métier
    if (player.illegalJob === 'hack') {
      cooldowns.hack = { label: 'Hack', dbField: 'lastHack', delay: 4 * 60 * 60 * 1000 };
    }

    const now = Date.now();
    let result = `⏳ **Temps restant pour ces commandes**\n\n`;

    for (const [key, data] of Object.entries(cooldowns)) {
      const lastTime = player[data.dbField];
      if (!lastTime) {
        result += `🟢 ${data.label} : \`Disponible maintenant\`\n`;
        continue;
      }

      const elapsed = now - new Date(lastTime).getTime();
      const remaining = data.delay - elapsed;

      if (remaining <= 0) {
        result += `🟢 ${data.label} : \`Disponible maintenant\`\n`;
      } else {
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        result += `🔴 ${data.label} : \`dans ${hours}h ${minutes}m ${seconds}s\`\n`;
      }
    }

    simpleReply(message, result);
  }
};
