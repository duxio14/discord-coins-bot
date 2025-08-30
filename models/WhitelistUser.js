
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('WhitelistUser', {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });
};
