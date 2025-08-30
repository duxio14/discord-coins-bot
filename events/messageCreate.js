const editCoins = require("../utils/editCoins");
const simpleReply = require('../utils/simpleReply');
const config = require("../config.json");

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    if (message.author.bot) return;

    console.log(message.content)
    const isCommand = message.content.startsWith(client.prefix);

    if (isCommand) {
   
      const args = message.content.slice(client.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases?.includes(commandName));
      
      if (!command) return;

      if (command.dette) {
        const player = await client.models.Players.findOne({
          where: { userId: message.author.id, guildId: message.guild.id }
        });

        if (player?.dette > 0) {
          return simpleReply(message, "❌ Tu ne peux pas utiliser cette commande tant que tu as une dette en cours.\n*.dette pour la payer*");
        }
      }

      if (command.wlOnly && message.author.id !== config.ownerId) {
        const whitelisted = await client.models.WhitelistUser.findOne({
          where: { userId: message.author.id }
        });

        if (!whitelisted) {
          return simpleReply(message, "`❌` Vous n'êtes pas autorisé à utiliser cette commande.");
        }
      }

      if (command.ownerOnly && message.author.id !== config.ownerId) {
        return simpleReply(message, "`❌` Seul l'owner peut utiliser cette commande.");
      }

      const now = Date.now();
      const cooldownTime = 2000;
      const userKey = `${message.author.id}-${message.guild?.id || 'DM'}`;

      client.globalCooldowns ??= new Map();

      const lastUsed = client.globalCooldowns.get(userKey);
      if (lastUsed && now - lastUsed < cooldownTime) return;

      client.globalCooldowns.set(userKey, now);
      setTimeout(() => client.globalCooldowns.delete(userKey), cooldownTime);

      try {
        console.log("jfbrekgbf")
        await command.execute(message, args, client);
      } catch (err) {
        console.error(`Erreur dans la commande ${command.name}:`, err);
        message.reply('Une erreur est survenue ❌').catch(() => {});
      }

      return; 
    }

    if (!message.guild) return;

    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const msgCooldown = 10_000;

    if (client.messageCooldown.has(key) && now - client.messageCooldown.get(key) < msgCooldown) return;

    client.messageCooldown.set(key, now);
    setTimeout(() => client.messageCooldown.delete(key), msgCooldown);

    try {
      await editCoins(client, message.author.id, message.guild.id, 10);
    } catch (error) {
      console.error(`Erreur lors de l'ajout de coins à ${message.author.tag} :`, error);
    }
  }
};
