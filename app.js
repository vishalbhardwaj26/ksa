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
var bot = new builder.UniversalBot(connector, (session) => {
    session.sendTyping();
    setTimeout(() => {
        session.send('Sorry could not understand you, Please select among the options for better Answers');
        var msg = new builder.Message(session);
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
        msg.attachments([
            new builder.ThumbnailCard(session)
                .title("Support Related Queries")
                .images(getSupportImage(session))
                .buttons([
                    builder.CardAction.imBack(session, "need assistance on support please", "Support"),
                ]),
            new builder.ThumbnailCard(session)
                .title("License Related Queries")
                .images(getLicenseImage(session))
                .buttons([
                    builder.CardAction.imBack(session, "need assistance on license Please", "License")
                ])
        ]);
        session.send(msg).endDialog();
    }, 3000);
});
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
    defaultMessage: "I don't understand! Sometimes I have an easier time with a few simple keywords. You can visit www.keysight.com or contact at business support for better solution at 800.507.6274",
    qnaThreshold: 0.5
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
    defaultMessage: "I don't understand! Sometimes I have an easier time with a few simple keywords. You can visit www.keysight.com or contact at business support for better solution at 800.507.6274",
    qnaThreshold: 0.5
}
);

bot.dialog('serviceQNADialog', serviceQNADialog);
bot.dialog('licenseQNADialog', licenseQNADialog);


bot.dialog('fromCards', (session) => {
    session.send('Sure let me know what you need to know about ?');
}).triggerAction({ matches: 'supportHelp'});



bot.dialog('Licensing',
    (session) => {
        session.sendTyping();
        session.replaceDialog('licenseQNADialog')
    }
).triggerAction({
    matches: 'Licensing'
})

bot.dialog('Support',
    (session) => {
        session.sendTyping();
        session.replaceDialog('serviceQNADialog')
    }
).triggerAction({
    matches: 'Support'
})

bot.dialog('manual',
    [(session) => {
        session.sendTyping();
        var msg = new builder.Message(session);
        msg.attachmentLayout(builder.AttachmentLayout.list)
        msg.attachments([
            new builder.ThumbnailCard(session)
                .title("For any manual related query visit")
                .buttons([
                    builder.CardAction.openUrl(session, "https://service.keysight.com/infoline/public/details.aspx?i=MAN", "Manual")
                ])
        ]);
        session.send('Sure, You can refer the following manual for the query');
        session.send(msg);
    }, (session, results) => {
        session.endDialog(`${results.response}`);
    }]
).triggerAction({
    matches: 'manual'
})


bot.dialog('greeting', [ (session) => {
    session.sendTyping();
    setTimeout(() => {
        builder.Prompts.text(session, 'Hi! What is your name ?');
    }, 3000);
}, (session, results ) => {
        session.endDialog(`Hello ${results.response}! I am Keybot, Please tell me how can i help you`);
}
]).triggerAction( { matches : 'greeting'})


bot.dialog('greetingAcceptance', (session) => {
    session.send('Your Welcome, I am here ping me if you need anything else');
}).triggerAction( { matches : 'greetingAcceptance'})


function getSupportImage(session) {
    return [
        builder.CardImage.create(session, 'data:image/jpeg;base64,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')
    ];
}

function getLicenseImage(session) {
    return [
        builder.CardImage.create(session, 'https://static.thenounproject.com/png/8005-200.png')
    ];
}

server.get('/', restify.plugins.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));
