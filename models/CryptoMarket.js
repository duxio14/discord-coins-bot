const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('cryptoMarket', {
    guildId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    currentPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100.0 
    },
    lastUpdate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    historicalPrices: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]'
    }
  });
};
