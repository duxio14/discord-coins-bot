const simpleReply = require('../../utils/simpleReply');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

registerFont(path.resolve(__dirname, '../../assets/fonts/inter.ttf'), {
  family: 'Inter 24pt', 
  weight: 'Bold'
});

module.exports = {
  name: 'team',
  description: "Affiche les informations de votre team.",
  async execute(message, args, client) {
    if (!message.guild) return;

    const userId = message.author.id;

    const teamMember = await client.models.TeamMembers.findOne({ where: { userId } });
    if (!teamMember) return simpleReply(message, "❌ Vous n'appartenez à aucune équipe.");

    const team = await client.models.Teams.findOne({ where: { id: teamMember.teamId } });
    if (!team) return simpleReply(message, "❌ Impossible de récupérer les informations de votre équipe.");
    const allTeamMembers = await client.models.TeamMembers.findAll({ where: { teamId: team.id } });
    const memberCount = allTeamMembers.length;

    try {

      const background = await loadImage(path.join(__dirname, '../../assets/images/team.png'));

      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext('2d');
      

      ctx.drawImage(background, 0, 0);

      ctx.font = 'bold 55px "Inter 24pt"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(team.name, 438, 345);
      

      ctx.fillText(`${team.balance || 0} coins`, 440, 505);
      

      ctx.fillText(`${memberCount}`, 538, 665);
      

      const buffer = canvas.toBuffer();
      const attachment = { files: [{ attachment: buffer, name: 'team_card.png' }] };
      
      await message.reply(attachment);
    } catch (error) {
      console.error('Erreur lors de la création de l\'image:', error);
      return simpleReply(message, "❌ Une erreur est survenue lors de la génération de la carte d'équipe.");
    }
  }
};