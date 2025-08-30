const simpleReply = require('../../utils/simpleReply');

module.exports = {
  name: 'wl',
  description: "Whitelister un membre.",
  ownerOnly: true,
  async execute(message, args, client) {

    if (!message.member.permissions.has('Administrator')) {
      return simpleReply(message, '`❌` Tu dois être admin pour faire ça.');
    }

    const sub = args[0];
    const userId = args[1];
    const WhitelistUser = client.WhitelistUser;

    if (sub === 'add') {
      if (!userId || !/^\d+$/.test(userId)) {
        return simpleReply(message, '`❌` Donne un ID valide.');
      }

      const existing = await WhitelistUser.findOne({ where: { userId } });
      if (existing) return simpleReply(message, '`✅` Cet utilisateur est déjà whitelisté.');

      await WhitelistUser.create({ userId });
      return simpleReply(message, `\`✅\` ${userId} ajouté à la whitelist.`);
    }

    if (sub === 'remove') {
      const deleted = await WhitelistUser.destroy({ where: { userId } });
      return simpleReply(message, deleted
        ? `\`✅\` ${userId} retiré de la whitelist.`
        : '`❌` Utilisateur introuvable.');
    }

    if (["info", "list"].includes(sub)) {
      const users = await WhitelistUser.findAll();
      if (!users.length) return simpleReply(message, '`❌` Aucun membre whitelisté.');

      const list = await Promise.all(users.map(async (u) => {
        try {
          const user = await client.users.fetch(u.userId);
          return `${user.tag} (${user.id})`;
        } catch {
          return `[Inconnu] (${u.userId})`;
        }
      }));

      return simpleReply(message, `**Whitelist (${list.length})**\n\`\`\`python\n${list.join('\n')}\`\`\``);
    }

    return simpleReply(message, '`❓` Utilise `wl add/remove/list <id>`');
  }
};
