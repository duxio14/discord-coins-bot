const { Client, GatewayIntentBits, Collection, InteractionType } = require('discord.js');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const editCoins = require("./utils/editCoins");
const dailyPayments = require('./utils/dailyPay');
const cryptoUpdater = require('./utils/crypto');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// c'est en local là mais quand tu mets sur un vps modifie le host le username et rajoute le mdp

const sequelize = new Sequelize({
  host: "localhost",
  username: "root",
  database: "coins",
  port: 3306,
  dialect: 'mysql',
  define: {
      timestamps: true
  },
  logging: false
});
client.messageCooldown = new Map();

client.commandCooldowns = new Map();
client.coins = "<:coin:1367915494929076327>"

client.commands = new Collection();
client.models = {};
client.sequelize = sequelize;
client.prefix = config.prefix;

const modelsPath = path.join(__dirname, 'models');
fs.readdirSync(modelsPath).filter(file => file.endsWith('.js')).forEach(file => {
  const model = require(path.join(modelsPath, file))(sequelize);
  const modelName = file.split('.')[0];
  client.models[modelName] = model;
  console.log(`📊 Modèle chargé: ${modelName}`);
});

if (client.models.WhitelistUser) {
  client.WhitelistUser = client.models.WhitelistUser;
}

function loadCommands(directory) {
  const commandsDir = path.resolve(directory);
  const items = fs.readdirSync(commandsDir);
  
  for (const item of items) {
    const itemPath = path.join(commandsDir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {

      loadCommands(itemPath);
    } else if (item.endsWith('.js')) {
      try {
        const command = require(itemPath);
        if (command.name) {

          const category = path.basename(path.dirname(itemPath));
          command.category = category;
          client.commands.set(command.name, command);
        } else {
          console.log(`⚠️ Attention: Le fichier ${item} n'a pas de propriété 'name'`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${item}:`, error);
      }
    }
  }
}


client.on('interactionCreate', async interaction => {

  if ((interaction.isButton() && interaction.customId.startsWith('limbo_')) ||
  (interaction.isModalSubmit() && interaction.customId.startsWith('limbo_modal_'))) {
try {
  const limboCommand = client.commands.get('limbo');
  await limboCommand.handleInteraction(interaction, client);
} catch (error) {
  console.error('Erreur lors du traitement de l\'interaction limbo:', error);
}
return;
}
  if (interaction.type !== InteractionType.ModalSubmit || interaction.customId !== 'modal_take_loan') return;
  await interaction.deferReply({ephemeral: true});

  const amount = parseInt(interaction.fields.getTextInputValue('loan_amount'));
  if (isNaN(amount) || amount <= 0 || amount > 100000) {
    return interaction.reply({ content: "❌ Montant invalide ou supérieur à 100000.", ephemeral: true });
  }


  const totalToRepay = amount + (amount * 0.002); 

  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  const [player] = await client.models.Players.findOrCreate({
    where: { userId, guildId },
    defaults: { coins: 0, dette: 0 }
  });

  player.coins += amount;
  player.dette += totalToRepay;
  await player.save();

  return interaction.followUp({
    content: `✅ Tu as emprunté **${amount} coins**. Tu devras rembourser **${totalToRepay} coins** (**2%** d'intérêt).`,
    ephemeral: true
  });
});


dailyPayments(client);

loadCommands(path.join(__dirname, 'commands'));

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  client.on(event.name, (...args) => event.execute(...args, client));
}

client.once('ready', async () => {
  await sequelize.sync();
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  const guild = client.guilds.cache.get("1350505554770137159"); 
  if (guild) {
    await guild.members.fetch();
  }

  cryptoUpdater(client);

  setInterval(async () => {
	await client.guilds.fetch()
    client.guilds.cache.forEach(async guild => {
	await guild.members.fetch();
      guild.members.cache.forEach(async member => {
        if (
          member.voice.channel && 
          !member.user.bot &&
          member.roles.cache.has("1360264963960344596") 
        ) {
          try {
            await editCoins(client, member.id, guild.id, 200); 
          } catch (error) {
            console.error(`Erreur en ajoutant des coins à ${member.user.tag} :`, error);
          }
        }
      });
    });
  }, 1000 * 60); 
});

client.login(config.token);