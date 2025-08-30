const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('cryptoWallet', {
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    guildId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    },
    totalInvested: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastTransaction: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'guildId']
      }
    ]
  });
};