require('dotenv').config();
const Discord = require('discord.js');
const https = require('https');
const fs = require('fs');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX;
const ADMIN_ID = process.env.ADMIN_ID;
const QUOTES_CHANNEL_ID = process.env.QUOTES_CHANNEL_ID;

bot.login(TOKEN);

var quotesData;
try {
    quotesData = JSON.parse(fs.readFileSync('data.json'));
} catch (e) {}

bot.on('ready', () => {
    console.info("\n\n\"Faire de l'agilité, ce n'est pas faire de l'arrache !\"\n\n" + bot.user.tag + "\n\n");
    var index = 0;
    bot.user.setActivity(PREFIX + 'help', {type: 'PLAYING'})
});

bot.on('message', msg => {
    const args = msg.content.trim().split(' ');
    const command = args.shift().toLowerCase();
    if (command === 'ping') {
        msg.channel.send('pong');
    }
    if (command === PREFIX + 'help') {
        msg.channel.send({
            embed: {
                color: 3066993,
                title: "Aide",
                description: "Pour obtenir une citation du dieu Marqua, écris **" + PREFIX + "m**. Pour mettre à jour les citations, écris **" + PREFIX + "fill**. ***Attention*** ! Les citations doivent commencer et se finir par des guillements !",
                footer: {
                    text: "© Marquote, a Discord bot made by Carduin"
                }
            }
        });
    }
    if (command === PREFIX + "fill") {
        quotes = [];
        quotesChannel = bot.channels.cache.get(QUOTES_CHANNEL_ID);
        if (quotesChannel !== undefined) {
            getQuotesFromGivenChannel(quotesChannel, 1000).then(messages => {
                messages.forEach(message => {
                    quotes.push(message);
                });
                fs.writeFileSync('data.json', JSON.stringify(quotes,null, 4));
                quotesData = JSON.parse(fs.readFileSync('data.json'));
                msg.channel.send("Citations mises à jour !")
            });
        }
        else {
            msg.channel.send("Je n'ai pas accès au salon des citations indiqué !")
        }

    }
    if (command === PREFIX + "m") {
        if(quotesData != undefined) {
            randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
            msg.channel.send({
                embed: {
                    color: 15844367,
                    title: "Marqua dit...",
                    description: randomQuote,
                    footer: {
                        text: "© Christophe Marquesuzaà"
                    }
                }
            });
        }
        else {
            msg.channel.send("Pas de fichier de quotes. Merci d'exécuter la commande **" + PREFIX + "fill**.")
        }
    }
    if (command === PREFIX + "kill") {
        if(msg.author.id === ADMIN_ID) {
            msg.channel.send("", {
                files: [
                    "https://i.kym-cdn.com/entries/icons/mobile/000/034/135/adios.jpg"
                ]
            }).then(function() {
                process.exit()
            });
        } else {
            msg.channel.send("I'm sorry Dave, I'm afraid I can't do that")
        }
    }
});

async function getQuotesFromGivenChannel(channel, limit = 500) {
    const sum_messages = [];
    let last_id;
    while (true) {
        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        const messages = await channel.messages.fetch(options);

        const messagesContent = [];
        messages.forEach(message => {
            var content = message.content;
            if ((content.startsWith("\"") && content.endsWith("\"")) || (content.startsWith("«") && content.endsWith("»")) ) {
                sentContent = message.content.replace("«", "\"").replace("»", "\"");
                messagesContent.push(sentContent)
            }
        });


        sum_messages.push(...messagesContent);
        last_id = messages.last().id;

        if (messages.size != 100 || sum_messages >= limit) {
            break;
        }
    }
    return sum_messages;
}