const cron = require('node-cron');

module.exports = (client) => {
  cron.schedule('0 */6 * * *', async () => {
    const markets = await client.models.CryptoMarket.findAll();

    for (const market of markets) {
      const volatility = 0.30;
      const change = (Math.random() * 2 - 1) * volatility;
      const newPrice = Math.max(5, market.currentPrice * (1 + change));
      const roundedPrice = Math.round(newPrice * 100) / 100;

      const historicalPrices = JSON.parse(market.historicalPrices);
      historicalPrices.push({
        price: roundedPrice,
        timestamp: new Date().toISOString()
      });

      if (historicalPrices.length > 24) {
        historicalPrices.shift();
      }

      await market.update({
        currentPrice: roundedPrice,
        lastUpdate: new Date(),
        historicalPrices: JSON.stringify(historicalPrices)
      });

      console.log(`[CRYPTO] Marché ${market.guildId} mis à jour → ${roundedPrice}`);
    }
  });
};
