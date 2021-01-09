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
    bot.user.setActivity(PREFIX + 'help', {type: 'PLAYING'})
});

bot.on('message', msg => {
    const args = msg.content.trim().split(' ');
    const command = args.shift().toLowerCase();

    var hasArguments = args.length > 0;
    var authorIsNotSelf = msg.author.id !== bot.user.id;
    var authorIsAdmin = msg.author.id === ADMIN_ID;
    var botIsMentionned = msg.mentions.has(bot.user);
    var messageIsNotDM = msg.guild !== null;
    var keywordsDataExists = keywordsData !== undefined;
    var quotesDataExists = quotesData !== undefined;
    var quotesChannelIsAccessible = bot.channels.cache.get(QUOTES_CHANNEL_ID) !== undefined;
    var hasAnswered = false;

    //Classic commands
    switch(command) {
        case 'ping':
            msg.channel.send('pong');
            hasAnswered = true;
            break;
        case PREFIX + 'help' :
            msg.channel.send({
                embed: {
                    color: 3066993,
                    title: "Aide",
                    description: "Liste des commandes :",
                    fields: [
                        {
                            name: 'Obtenir une citation',
                            value: "Pour obtenir une citation du dieu Marqua, écris **" + PREFIX + "m**. Pour mettre à jour les citations, écris **" + PREFIX + "f**. ***Attention*** ! Les citations doivent commencer et se finir par des guillements !"
                        },
                        {
                            name: 'Compléter une citation',
                            value: "Pour que le bot termine une citation, écris **" + PREFIX + "c** suivi du début de la citation de ton choix."
                        }
                    ],
                    footer: {
                        text: "© Marquote, a Discord bot made by Carduin"
                    }
                }
            });
            hasAnswered = true;
            break;
        case PREFIX + 'f' :
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
                        //Nettoyage des citations : suppression d'espaces inutiles et suppression d'émojis
                        quote = quote.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
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
                    extraction_result = removeRandomElementsFromArray(extraction_result, Math.floor(extraction_result.length/4));
                    fs.writeFileSync('keywords.json', JSON.stringify(extraction_result,null, 4));
                    keywordsData = JSON.parse(fs.readFileSync('keywords.json'));
                });
            }
            else {
                msg.channel.send("Je n'ai pas accès au salon des citations indiqué !")
            }
            hasAnswered = true;
            break;
        case PREFIX + 'm' :
            if(quotesDataExists) {
                randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
                msg.channel.send({
                    embed: {
                        color: 15844367,
                        title: "Marqua dit...",
                        description: randomQuote
                    }
                });
            }
            else {
                msg.channel.send("Pas de fichier de quotes. Merci d'exécuter la commande **" + PREFIX + "f**.")
            }
            hasAnswered = true;
            break;
        case PREFIX + 'c' :
            //Auto complete
            if(authorIsNotSelf && quotesDataExists) {
                if(hasArguments) {
                    var NoQuoteFound = true;
                    var currentQuote = 0;
                    var substring = args.join(' ');
                    while (NoQuoteFound && currentQuote < quotesData.length) {
                        if (quotesData[currentQuote].startsWith(substring) ) {
                            msg.channel.send("..." + quotesData[currentQuote ].replace(substring, ''));
                            NoQuoteFound = false;
                        }
                        else {
                            currentQuote++;
                        }
                    }
                    if(NoQuoteFound) {
                        msg.channel.send("Alors la je suis sans mots...Je n'ai rien trouvé à compléter");
                    }
                }
                else {
                    msg.channel.send("Merci de saisir des mots pour compléter la citation");
                }
                hasAnswered = true;
            }
            break;
        case PREFIX + 's' :
            if (authorIsAdmin && messageIsNotDM) { //If sender is the bot admin OR message is not in a DM
                msg.delete();
                msg.channel.send(args.join(' '));
            }
            hasAnswered = true;
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
                hasAnswered = true;
            }
            break;
        default:
            break;
    }

    //Keywords reaction
    if(authorIsNotSelf && keywordsDataExists && quotesDataExists && !hasAnswered) {
        var keywordNotFound = true;
        var currentKeyword = 0;
        while (keywordNotFound && currentKeyword < keywordsData.length) {
            if(msg.content.includes(keywordsData[currentKeyword])) {
                randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
                msg.channel.send(randomQuote);
                hasAnswered = true;
                keywordNotFound = false;
            }
            else {
                currentKeyword ++;
            }
        }
    }

    //Help if mentionned
    if (botIsMentionned) {
        if (msg.content === "<@!" + bot.user.id + ">" || msg.content === "<@!" + bot.user.id + "> ") {
            msg.channel.send('Mon préfixe est : **' + PREFIX + "**");
            hasAnswered = true;
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
                sentContent = message.content.slice(1,-1).trim();
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