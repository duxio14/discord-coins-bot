

  const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Jackpots', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
      },
      amount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
  });
};