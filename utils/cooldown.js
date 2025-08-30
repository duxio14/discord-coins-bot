/**
 * Vérifie si un utilisateur est en cooldown pour une commande spécifique
 * @param {Object} player 
 * @param {string} cooldownField 
 * @param {number} cooldownTime 
 * @returns {Object} 
 */
function checkCooldown(player, cooldownField, cooldownTime) {
    const now = new Date();
    const lastUsage = player[cooldownField] ? new Date(player[cooldownField]) : null;
    
    if (!lastUsage) {
      return { 
        onCooldown: false,
        timeLeft: '0',
        resetTime: now
      };
    }
    
    const timeDiff = now.getTime() - lastUsage.getTime();
    const timeRemaining = cooldownTime - timeDiff;
    
    if (timeRemaining <= 0) {
      return { 
        onCooldown: false,
        timeLeft: '0',
        resetTime: now
      };
    }
    
    const resetTime = new Date(lastUsage.getTime() + cooldownTime);
  
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    let timeLeftFormatted = '';
    if (hours > 0) timeLeftFormatted += `${hours}h `;
    if (minutes > 0) timeLeftFormatted += `${minutes}m `;
    timeLeftFormatted += `${seconds}s`;
    
    return {
      onCooldown: true,
      timeLeft: timeLeftFormatted,
      resetTime: resetTime
    };
  }
  
  module.exports = checkCooldown;