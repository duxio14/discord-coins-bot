module.exports = async function resolveMember(message, args) {
    let member = message.author;

    if (message.mentions.users.first()) {
        member = message.mentions.users.first();
    } else if (args[0] && message.guild.members.cache.get(args[0])) {
        member = message.guild.members.cache.get(args[0]).user;
    } else if (args[0]) {

        const found = message.guild.members.cache.find(m =>
            m.user.username.toLowerCase().includes(args[0].toLowerCase()) ||
            m.user.tag.toLowerCase().includes(args[0].toLowerCase())
        );
        if (found) member = found.user;
    }

    return member;
}
