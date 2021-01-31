require('dotenv').config();
const Discord = require('discord.js');
const mysql = require('mysql');
const keyword_extractor = require("keyword-extractor");

const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const PREFIX = process.env.PREFIX;
const ADMIN_ID = process.env.ADMIN_ID;
const QUOTES_CHANNEL_ID = process.env.QUOTES_CHANNEL_ID;
const DB_HOST= process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_NAME= process.env.DB_NAME;
const DB_USER= process.env.DB_USER;
const DB_PASSWORD= process.env.DB_PASSWORD;
let dbConnection;

bot.login(TOKEN);

bot.on('ready', () => {
    console.info("\n\n\"Faire de l'agilité, ce n'est pas faire de l'arrache !\"\n\n" + bot.user.tag + "\n\n");
    bot.user.setActivity(PREFIX + 'help', {type: 'PLAYING'})

    dbConnection = mysql.createConnection({
        host     : DB_HOST,
        port     : DB_PORT,
        user     : DB_USER,
        password : DB_PASSWORD,
        database : DB_NAME
    });

    checkDatabaseSetup();

    addQuote("\"prout\"")
});

bot.on('message', msg => {
    const args = msg.content.trim().split(' ');
    const command = args.shift().toLowerCase();

    var hasArguments = args.length > 0;
    var authorIsNotSelf = msg.author.id !== bot.user.id;
    var authorIsAdmin = msg.author.id === ADMIN_ID;
    var botIsMentionned = msg.mentions.has(bot.user);
    var messageIsNotDM = msg.guild !== null;

    //Classic commands
    switch(command) {
        case 'ping':
            msg.channel.send('pong');
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
            break;
        case PREFIX + 's' :
            if (authorIsAdmin && messageIsNotDM) { //If sender is the bot admin OR message is not in a DM
                msg.delete();
                msg.channel.send(args.join(' '));
            }
            break;
        default:
            break;
    }
    //Help if mentionned
    if (botIsMentionned) {
        if (msg.content === "<@!" + bot.user.id + ">" || msg.content === "<@!" + bot.user.id + "> ") {
            msg.channel.send('Mon préfixe est : **' + PREFIX + "**");
        }
    }

});

/////////////////////// USEFUL FUNCTIONS

function removeRandomElementsFromArray(arr, newLength) {
    var a = arr.slice();
    while (a.length > newLength) a.splice(randInt(a.length - 1), 1);
    return a;
}

async function getQuotesFromGivenChannelAndFlagIfNotCorrect(channel, limit = 500) {
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

/////////////////////// DATABASE FUNCTIONS

function checkDatabaseSetup() {
    dbConnection.query("CREATE TABLE IF NOT EXISTS quotes (id INT PRIMARY KEY AUTO_INCREMENT, text VARCHAR(255), cooldown INT(2))", function (err, result) {
    });

    dbConnection.query("CREATE TABLE IF NOT EXISTS keywords (id INT PRIMARY KEY, idQuote INT(4), text VARCHAR(255))", function (err, result) {
    });
}

function getAllQuotes () {
    /*
    Appel :
    getAllQuotes().then(rows => {
        console.log(rows);
    })
     */
    return new Promise(function (resolve, reject) {
        dbConnection.query("SELECT * FROM quotes", function (err, result) {
            if (err) {
                reject(err);
            }
            if (result.length > 0) {
                objectArray = [];
                result.forEach(currentResult => {
                    objectArray.push(new Quote(currentResult.id, currentResult.text, currentResult.cooldown))
                })
                resolve(objectArray);
            }
        })
    })

}

function getQuote (id) {

}

function getKeyWordsByQuote (id) {

}

function addQuote (text) {
    dbConnection.query("INSERT INTO quotes (`text`, `cooldown`) VALUES ('" + text + "', 5)", function (err, result) {
    });
}

function addQuoteKeyword (text, quoteId) {

}

function editQuote (quoteObject) {

}

/////////////////////// CLASSES

class Quote {
    #id;
    #text;
    #cooldown;

    constructor (id, quote, cooldown) {
        this.id = id;
        this.quote = quote;
        this.cooldown = cooldown;
    }

    getId() {
        return this.#id;
    }

    getText() {
        return this.#text;
    }

    getCooldown() {
        return this.#cooldown;
    }

    setCooldown(cooldown) {
        this.#cooldown = cooldown;
    }
}

class Keyword {
    #id;
    #idQuote;
    #text;

    constructor (id, idQuote, text) {
        this.id = id;
        this.idQuote = idQuote;
        this.text = text;
    }

    getId() {
        return this.#id;
    }

    getText() {
        return this.#text;
    }

    getQuoteId() {
        return this.#idQuote;
    }
}