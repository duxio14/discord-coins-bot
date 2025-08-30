
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('players', {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    guildId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    coins: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    banque: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    lastWorked: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastDaily: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastGift: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRob: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastHack: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    protectionUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Métier légal
    legalJob: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    legalJobSince: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    legalJobEarnings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },

    // Métier illégal
    illegalJob: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    illegalJobSince: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    illegalJobEarnings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    dette: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    drugInventory: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}' // JSON vide par défaut
    },
    wallet: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lastInterest: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
    
    

  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'guildId'],
      },
    ],
  });
};
