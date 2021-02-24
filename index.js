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
let db_config;

bot.login(TOKEN);

bot.on('ready', () => {
    console.info("\n\n\"Faire de l'agilité, ce n'est pas faire de l'arrache !\"\n\n" + bot.user.tag + "\n\n");
    bot.user.setActivity(PREFIX + 'help', {type: 'PLAYING'})

    db_config = {
        host     : DB_HOST,
        port     : DB_PORT,
        user     : DB_USER,
        password : DB_PASSWORD,
        database : DB_NAME,
        charset : 'utf8mb4'
    };

    handleDisconnect();

    checkDatabaseSetup();
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
        case PREFIX + 'f' :
            checkDatabaseSetup();
            let quotesChannel = bot.channels.cache.get(QUOTES_CHANNEL_ID);
            let quotesChannelIsAccessible = bot.channels.cache.get(QUOTES_CHANNEL_ID) !== undefined
            if (quotesChannelIsAccessible) {
                getCurrentSavedQuotesNumber().then(currentSavedNumber => {
                    getQuotesFromGivenChannelAndFlagIfNotCorrect(quotesChannel, 1000).then(messages => {
                        numberOfQuotesToAdd = messages.length - currentSavedNumber;
                        if(numberOfQuotesToAdd > 0) {
                            for(i = 0; i <= numberOfQuotesToAdd -1; i++) {
                                addQuote(messages[i]);

                                let cleanQuote = messages[i];
                                //Nettoyage des citations : suppression d'espaces inutiles et suppression d'émojis
                                cleanQuote = cleanQuote.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                                //Suppression des tirets
                                cleanQuote = cleanQuote.replace(/-/g, '').trim();
                                //Suppression des étoiles
                                cleanQuote = cleanQuote.replace(/\*/g, '').trim();

                                var extraction_result = keyword_extractor.extract(cleanQuote,{
                                    language:"french",
                                    remove_digits: true,
                                    return_changed_case:false,
                                    remove_duplicates: true
                                });
                                if(extraction_result.length > 0 ) {
                                    extraction_result.forEach(keyword => {
                                        addQuoteKeyword(i+1, keyword); //Because Mysql AUTO INCREMENT begins at 1
                                    })
                                }
                            }
                            msg.channel.send("Citations mises à jour ("+ numberOfQuotesToAdd +") !");
                        }
                        else {
                            msg.channel.send("Aucune citation à ajouter !");
                        }
                    })
                })
            }
            break;
        case PREFIX + 'm' :
            checkDatabaseSetup();
            getRandomQuote().then(quote => {
                msg.channel.send({
                    embed: {
                        color: 15844367,
                        title: "Marqua dit...",
                        description: quote.text
                    }
                });
            }).catch(error => {
                msg.channel.send("Une erreur est survenue ! Il est probablement nécéssaire d'utiliser la commande **" + PREFIX + "f**");
            });
            break;
        case PREFIX + 's' :
            if (authorIsAdmin && messageIsNotDM) { //If sender is the bot admin OR message is not in a DM
                msg.delete();
                msg.channel.send(args.join(' '));
            }
            break;
        case PREFIX + 'c' :
            checkDatabaseSetup();
            //Auto complete
            if(authorIsNotSelf) {
                if(hasArguments) {
                    getAllQuotes().then(quotes => {
                        var NoQuoteFound = true;
                        var currentQuote = 0;
                        var substring = args.join(' ');
                        while (NoQuoteFound && currentQuote < quotes.length) {
                            currentQuoteData = quotes[currentQuote];
                            if (currentQuoteData.text.toLowerCase().startsWith(substring.toLowerCase()) ) {
                                msg.channel.send("..." + currentQuoteData.text.substring(substring.length));
                                NoQuoteFound = false;
                            }
                            else {
                                currentQuote++;
                            }
                        }
                        if(NoQuoteFound) {
                            msg.channel.send("Alors la je suis sans mots...Je n'ai rien trouvé à compléter");
                        }
                    }).catch(err => {
                        msg.channel.send("Une erreur est survenue ! Il est probablement nécéssaire d'utiliser la commande **" + PREFIX + "f**");
                    })
                }
                else {
                    msg.channel.send("Merci de saisir des mots pour compléter la citation");
                }
            }
            break;
        default:
            //Help if mentionned
            if (botIsMentionned) {
                if (msg.content === "<@!" + bot.user.id + ">" || msg.content === "<@!" + bot.user.id + "> ") {
                    msg.channel.send('Mon préfixe est : **' + PREFIX + "**");
                }
            }

            //Keywords reaction
            if(authorIsNotSelf) {
                var hasAnswered = false;
                checkDatabaseSetup();
                getAllQuotes().then(quotes => {
                    var matchNotFound = true;
                    var currentQuote = 0;
                    while(matchNotFound && currentQuote < quotes.length) {
                        let currentQuoteData = quotes[currentQuote];
                        getKeyWordsByQuote(quotes[currentQuote].id).then(keywords => {
                            var keywordMatchNumber = 0;
                            keywords.forEach(keyword => {
                                startCase = msg.content.toLowerCase().includes(" " + keyword.text.toLowerCase());
                                middleCase = msg.content.toLowerCase().includes(" " + keyword.text.toLowerCase() + " ");
                                endCase = msg.content.toLowerCase().includes(keyword.text.toLowerCase() + " ");
                                if(startCase || middleCase || endCase) {
                                    keywordMatchNumber++;
                                }
                            })
                            if((keywordMatchNumber >= keywords.length/3) && !hasAnswered) {
                                var oddsPercentage = Math.random() * 100;
                                if(oddsPercentage >= 80) { // 20% de chances
                                    if(currentQuoteData.cooldown === 0 ) {
                                        matchNotFound = false;
                                        msg.channel.send(currentQuoteData.text);
                                        updateQuoteCooldown(currentQuoteData.id, 5);
                                        hasAnswered = true;
                                    }
                                    else {
                                        updateQuoteCooldown(currentQuoteData.id, currentQuoteData.cooldown-1);
                                    }
                                }
                            }
                        });
                        currentQuote++;
                    }
                }).catch(err => {

                })
            }
            break;
    }
});

/////////////////////// USEFUL FUNCTIONS

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

function format_string_for_mysql_query (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}

/////////////////////// DATABASE FUNCTIONS

function checkDatabaseSetup() {
    dbConnection.query("CREATE TABLE IF NOT EXISTS quotes (id INT PRIMARY KEY AUTO_INCREMENT, text TEXT, cooldown INT(2)) CHARACTER SET utf8mb4", function (err, result) {
    });

    dbConnection.query("CREATE TABLE IF NOT EXISTS keywords (id INT PRIMARY KEY AUTO_INCREMENT, idQuote INT(4), text VARCHAR(255)) CHARACTER SET utf8mb4", function (err, result) {
    });
}

function handleDisconnect() {
    dbConnection = mysql.createConnection(db_config);

    dbConnection.connect(function(err) {
        if(err) {
            setTimeout(handleDisconnect, 2000);
        }
    });

    dbConnection.on('error', function(err) {
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

function getAllQuotes () {
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

function getRandomQuote() {
    return new Promise(function (resolve, reject) {
        dbConnection.query("SELECT * FROM quotes ORDER BY RAND() LIMIT 1", function (err, result) {
            if (err) {
                reject(err);
            }
            if (result.length > 0) {

                resolve(new Quote(result[0].id, result[0].text, result[0].cooldown));
            }
            else {
                reject("TABLE_EMPTY")
            }
        })
    })
}

function getKeyWordsByQuote (id) {
    return new Promise(function (resolve, reject) {
        dbConnection.query("SELECT keywords.id, keywords.idQuote, keywords.text FROM keywords JOIN quotes ON keywords.idQuote = quotes.id WHERE idQuote = " + id, function (err, result) {
            if (err) {
                reject(err);
            }
            if (result.length > 0) {
                objectArray = [];
                result.forEach(currentResult => {
                    objectArray.push(new Keyword(currentResult.id, currentResult.idQuote, currentResult.text))
                })
                resolve(objectArray);
            }
        })
    })
}

function getCurrentSavedQuotesNumber() {
    return new Promise(function (resolve, reject) {
        dbConnection.query("SELECT COUNT(*) FROM quotes ", function (err, result) {
            if (err) {
                reject(err);
            }
            if (result.length > 0) {
                resolve(result[0]['COUNT(*)']);
            }
            else {
                reject("TABLE_EMPTY")
            }
        })
    })
}

function addQuote (text) {
    dbConnection.query("INSERT INTO quotes (`text`, `cooldown`) VALUES ('" + format_string_for_mysql_query(text) + "', 0)", function (err, result) {
    });
}

function addQuoteKeyword (quoteId, text) {
    dbConnection.query("INSERT INTO keywords (`idQuote`, `text`) VALUES (" + quoteId +",'" + format_string_for_mysql_query(text) + "')", function (err, result) {
    });
}

function updateQuoteCooldown (id, cooldown) {
    dbConnection.query("UPDATE quotes SET cooldown = " + cooldown + " WHERE id = " + id, function (err, result) {
    });
}

/////////////////////// CLASSES

class Quote {
    id;
    text;
    cooldown;

    constructor (id, text, cooldown) {
        this.id = id;
        this.text = text;
        this.cooldown = cooldown;
    }
}

class Keyword {
    id;
    idQuote;
    text;

    constructor (id, idQuote, text) {
        this.id = id;
        this.idQuote = idQuote;
        this.text = text;
    }
}