require('dotenv').config();
const Discord = require('discord.js');
const https = require('https');
const fs = require('fs');
const keyword_extractor = require("keyword-extractor");
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX;
const ADMIN_ID = process.env.ADMIN_ID;
const QUOTES_CHANNEL_ID = process.env.QUOTES_CHANNEL_ID;
const KEYWORDS_REACTION_CHANNEL_ID = process.env.KEYWORDS_REACTION_CHANNEL_ID;
var invalidQuotesFound;

bot.login(TOKEN);

var quotesData;
var keywordsData;
try {
    quotesData = JSON.parse(fs.readFileSync('quotes.json'));
    keywordsData = JSON.parse(fs.readFileSync('keywords.json'));
} catch (e) {}

bot.on('ready', () => {
    console.info("\n\n\"Faire de l'agilité, ce n'est pas faire de l'arrache !\"\n\n" + bot.user.tag + "\n\n");
    var index = 0;
    bot.user.setActivity(PREFIX + 'help', {type: 'PLAYING'})
});

bot.on('message', msg => {
    const args = msg.content.trim().split(' ');
    const command = args.shift().toLowerCase();

    authorIsNotSelf = msg.author.id !== bot.user.id;
    authorIsAdmin = msg.author.id === ADMIN_ID;
    botIsMentionned = msg.mentions.has(bot.user);
    messageIsNotDM = msg.guild !== null;
    messageIsFromKeyWordsReactionChannel = msg.channel.id === KEYWORDS_REACTION_CHANNEL_ID;
    keywordsDataExists = keywordsData !== undefined;
    quotesDataExists = quotesData !== undefined;
    quotesChannelIsAccessible = bot.channels.cache.get(QUOTES_CHANNEL_ID) !== undefined;
    keywordsChannelIsAccessible = bot.channels.cache.get(KEYWORDS_REACTION_CHANNEL_ID) !== undefined;


    switch(command) {
        case 'ping':
            msg.channel.send('pong');
            break;
        case PREFIX + 'help' :
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
            break;
        case PREFIX + 'fill' :
            quotes = [];
            quotesChannel = bot.channels.cache.get(QUOTES_CHANNEL_ID);
            if (quotesChannelIsAccessible) {
                getQuotesFromGivenChannelAndFlagIfNotCorrect(quotesChannel, 1000).then(messages => {
                    messages.forEach(message => {
                        quotes.push(message);
                    });
                    fs.writeFileSync('quotes.json', JSON.stringify(quotes,null, 4));
                    quotesData = JSON.parse(fs.readFileSync('quotes.json'));

                    invalidQuotesFoundErrorMessage = "";

                    if(invalidQuotesFound) {
                        invalidQuotesFoundErrorMessage = " **Attention**, des citations invalides ont été trouvées, et marquées avec ❌.";
                    }

                    msg.channel.send("Citations mises à jour (" + messages.length +") !" + invalidQuotesFoundErrorMessage);

                    var sentence = "";
                    quotesData.forEach(quote =>  {
                        //Nettoyage des citations : suppression des guillemets en début / fin, suppression d'espaces inutiles et suppression d'émojis
                        quote = quote.slice(1,-1).trim().replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                        //Suppression des tirets
                        quote = quote.replace(/-/g, '').trim();
                        //Suppression des étoiles
                        quote = quote.replace(/\*/g, '').trim();
                        sentence += quote;
                        sentence += ". ";
                    })
                    //var sentence = quotesData.join('.');
                    var extraction_result =
                        keyword_extractor.extract(sentence,{
                            language:"french",
                            remove_digits: true,
                            return_changed_case:false,
                            remove_duplicates: true
                        });
                    extraction_result = removeRandomElementsFromArray(extraction_result, Math.floor(extraction_result.length/2));
                    fs.writeFileSync('keywords.json', JSON.stringify(extraction_result,null, 4));
                    keywordsData = JSON.parse(fs.readFileSync('keywords.json'));
                });
            }
            else {
                msg.channel.send("Je n'ai pas accès au salon des citations indiqué !")
            }
            break;
        case PREFIX + 'm' :
            if(quotesDataExists) {
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
            break;
        case PREFIX + 'speak' :
            if (authorIsAdmin && messageIsNotDM) { //If sender is the bot admin OR message is not in a DM
                msg.delete();
                msg.channel.send(args.join(' '));
            }
            break;
        case '&p' :
            listePresentiel = [
                "<@377171004167946242>", //Arthur
                "<@660418243718283284>", //Marina
                "<@338248910717976577>", //Damien
                "<@321684578240823297>", //Matthieu
                "<@398573484931809290>", //Lea
                "<@367636529599873024>" //Thomas
            ];
            if(msg.channel.id == "737389053695098932") {
                msg.channel.send( listePresentiel.join(" ") + ", Venez ouvrir la porte ou je vous met un coup de boule rotatif à Mach 20")
            }
            break;
        default:
            break;
    }

    if(authorIsNotSelf && keywordsDataExists) {
        keywordsData.forEach(keyword => {
            if (msg.content.includes(keyword)) {
                if(quotesData != undefined) {
                    randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
                    msg.channel.send(randomQuote.slice(1,-1).trim());
                }
            }
        })
    }

    if (botIsMentionned) {
        if (msg.content === "<@!" + bot.user.id + ">" || msg.content === "<@!" + bot.user.id + "> ") {
            msg.channel.send('Mon préfixe est : **' + PREFIX + "**");
        }
    }
});

function removeRandomElementsFromArray(arr, newLength) {
    var a = arr.slice();
    while (a.length > newLength) a.splice(randInt(a.length - 1), 1);
    return a;
}

async function getQuotesFromGivenChannelAndFlagIfNotCorrect(channel, limit = 500) {
    invalidQuotesFound = false;
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
                messagesContent.push(sentContent);
            }
            else {
                message.react('❌');
                invalidQuotesFound = true;
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

function randInt(max, min) {
    return ((min | 0) + Math.random() * (max + 1)) | 0;
}