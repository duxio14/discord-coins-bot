
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  
    return sequelize.define('TeamMembers', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        userId: {
          type: DataTypes.STRING,
          allowNull: false
        },
        role: {
          type: DataTypes.ENUM('owner', 'staff', "ainé", 'membre'),
          defaultValue: 'membre'
        },
        joinedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
        }
      });
    
      
};
