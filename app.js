/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var builder_cognitiveservices = require("botbuilder-cognitiveservices");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

require('dotenv').config();

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);



// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

var luisRecognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(luisRecognizer);


// Recognizer and and Dialog for preview QnAMaker service
var licenseRecognizer = new builder_cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.licenseQNABASEID,
    authKey: process.env.QnAAuthKey || process.env.QnASubscriptionKey,
    endpointHostName: process.env.QnAEndpointHostName
});

var licenseQNADialog = new builder_cognitiveservices.QnAMakerDialog({
    recognizers: [licenseRecognizer],
    defaultMessage: 'No match found related to license!',
    qnaThreshold: 0.3
}
);


// Recognizer and and Dialog for GA QnAMaker service
var serviceRecognizer = new builder_cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.ServiceAQNABASEID,
    authKey: process.env.QnAAuthKey || process.env.QnASubscriptionKey, // Backward compatibility with QnAMaker (Preview)
    endpointHostName: process.env.QnAEndpointHostName
});

var serviceQNADialog = new builder_cognitiveservices.QnAMakerDialog({
    recognizers: [serviceRecognizer],
    defaultMessage: 'No match found related to service',
    qnaThreshold: 0.3
}
);

bot.dialog('serviceQNADialog', serviceQNADialog);
bot.dialog('licenseQNADialog', licenseQNADialog);

server.get('/', restify.plugins.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));


bot.dialog('Licensing',
    (session) => {
        session.send('You reached the Licensing Department');
        session.replaceDialog('licenseQNADialog');
    }
).triggerAction({
    matches: 'Licensing'
})


bot.dialog('Support',
    (session) => {
        session.send('You reached the Support Department');
        session.replaceDialog('serviceQNADialog');
    }
).triggerAction({
    matches: 'Support'
})  

bot.dialog('greeting',
    (session) => {
        session.send('Hi How I may help you');
        session.endDialog();
    }
).triggerAction({
    matches: 'greeting'
})  
