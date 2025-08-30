// applyBankInterest.js
module.exports = async function applyBankInterest(client, userId) {
    const INTEREST_INTERVAL = 1000 * 60 * 60 * 24;
    const INTEREST_RATE = 0.015; 
  
    const player = await client.models.Players.findOne({ where: { userId: userId } });
    if (!player || player.banque <= 0) return { gained: 0, periods: 0 };
  
    const now = Date.now();
    const last = new Date(player.lastInterest || 0).getTime();
    const elapsed = now - last;
  
    if (elapsed < INTEREST_INTERVAL) return { gained: 0, periods: 0 };
  
    const periods = Math.floor(elapsed / INTEREST_INTERVAL);
    const newAmount = Math.floor(player.banque * Math.pow(1 + INTEREST_RATE, periods));
    const gained = newAmount - player.banque;
  
    await client.models.Players.update({
      banque: newAmount,
      lastInterest: new Date(last + periods * INTEREST_INTERVAL)
    }, { where: { id: userId } });
  
    return { gained, periods };
  };
  