# Marquote

## Descriptif
Marquote est un bot Discord permettant de sortir à volonté des citations comiques d'un enseignant.
Le bot est également doté d'une fonction lui permettant de réagir à des mots clés sélectionnés parmi les citations, pour répondre par une citation liée et créer des situations humoristiques.

## Installation

- Mettre en place sur le serveur de votre choix une base de données sous le SGBD MySql
- Installation des dépendances : `cd marquote-master && npm install`
- Changer le fichier `.env-sample` en `.env`
- Modifier les valeurs du fichier `.env` selon indications dans la partie **Paramétrage**
- Lancer le bot avec la commande `node index.js` ou `npm run launch`

## Paramétrage

Le paramétrage se fait via le fichier `.env`. Les options sont les suivantes :
- ***TOKEN*** (à renseigner **obligatoirement**) : Le token du bot à récuperer depuis l'application Discord Developper
- ***PREFIX*** (valeur par défaut = **!**) : Le préfixe à écrire avant chaque commande du bot
- ***ADMIN_ID*** (valeur par défaut = **377171004167946242**) : L'identifiant de l'utilisateur administrateur de l'instance du bot. Par défaut il s'agit de son créateur originel
- ***QUOTES_CHANNEL_ID*** (valeur par défaut = **380444002538749964**) : L'identifiant du salon de citations dans lequel le bot ira piocher pour alimenter sa base de données de citations
- ***DB_HOST*** (valeur par défaut = **localhost**) : Le serveur hébergeant la base de données à laquelle le bot se connectera
- ***DB_PORT*** (valeur par défaut = **3306**) : Le port de la base de données à laquelle le bot se connectera
- ***DB_NAME*** (valeur par défaut = **marquote**) : Le nom de la base de données à laquelle le bot se connectera
- ***DB_USER*** (valeur par défaut = **root**) : L'identifiant de l'utilisateur de la base de données à laquelle le bot se connectera
- ***DB_PASSWORD*** (valeur par défaut = **password**) : Le mot de passe de l'utilisateur de la base de données à laquelle le bot se connectera


## Commandes

> Toutes les commandes sont au format suivant : "_prefixe_commande" **SAUF** la commande ping qui s'écrit seule. 

La liste des commandes est la suivante :

Commande | Description | Exemple | Résultat attendu
------------ |  ------------- | ------------- | ------------
***ping*** | Permet de vérifier le bon fonctionnement du bot | ping | "pong"
***help*** | Permet d'afficher la liste des commandes utilisables | !help | Liste des commandes
***f*** | Permet au bot d'alimenter sa base de données à partir de l'identifiant d'un salon. Les citations sont récupérées dans le salon identifié. Les citations récupérées sont celles commencant et se finissant par des guillemets ou des chevrons | !fill | "Citations mises à jour !"
***s*** | Le bot enverra un message dans le salon ou la commande est exécutée, avec le message indiqué ensuite. Le message contenant la commande sera supprimé, comme si le bot parlait seul | !speak Hello. | "Hello."
***m*** | Permet d'obtenir une citation d'un enseignant. Il s'agit de la fonction principale du bot | !m | "Si ma tante en avait, ce serait mon oncle"
***c*** | Permet d'obtenir une auto complétion d'une citation enregistrée | !c Bitch | "... ! **dabe**"

## Analyse de mots clés

Comme expliqué dans le partie **Descriptif**, le bot est capable, à chaque message envoyé, d'analyser le message pour y chercher des mots clés d'une citation et réagir avec la citation correspondante.
Le fonctionnement est le suivant :
* Lors de l'enregistrement des citations, le bot détermine pour chacune des mots clés. La citation et les mots clés correspondants sont stockés dans la base de données.
* A chaque nouveau message, le bot va parcourir, pour chaque citation enregistrée, les mots clés correspondants et tester la présence de chaque mot clé pour chaque citation dans le message.
* Si le bot trouve plus d'un tiers des mots clés d'une citation dans le messages envoyé, ***it's a match!***
* Il y a alors 20% de chances que le bot dise juste après le message, sans aucun enclenchement de commande, la citation liée aux mots clés trouvés.
* Pour éviter une trop grande redondance, un cooldown est appliqué aux citations. Si une citation est dite par réaction à ses mots clés, un cooldown de 5 occurences est appliqué. C'est à dire que pour 5 fois où les critères ci-dessus ont été validés, la citation ne sortira pas malgré tout, et le bot en cherchera une autre.
