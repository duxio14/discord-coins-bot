
/**
 * 
 * @param {string} userId 
 * @param {string} guildId
 * @param {number} amount 
 * @returns {Promise<object>} 
 */
async function editCoins(client, userId, guildId, amount) {
    if (!userId || !guildId || typeof amount !== 'number') {
      throw new Error('Paramètres invalides pour editCoins');
    }
  
    const [userCoins] = await client.models.Players.findOrCreate({
      where: { userId, guildId },
      defaults: { coins: 0 },
    });
  
    userCoins.coins += amount;
  
    if (userCoins.coins < 0) userCoins.coins = 0;
  
    await userCoins.save();
    return userCoins;
  }

  module.exports = editCoins
  