const tmi = require('tmi.js');
const { clear } = require('tmi.js/lib/commands');
const _ = require('lodash');

process.env.NODE_ENV = 'development';

const config = require('./config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);

globalThis.gConfig = finalConfig;

// Define configuration options
const opts = {
  identity: {
    username: global.gConfig.identity.username,
    password: global.gConfig.identity.password
  },
  channels: global.gConfig.channels
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  
  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName === '!clear'){
	  client.clear(target);
  } else {
    if(countWords(commandName) <= global.gConfig.min_word_count)
    {
      client.deletemessage(target, context["id"]);
      client.say(target, `${context["username"]} Please use longer sentences.`);
    }
    console.log(`* Unknown command ${commandName}`);
  }
}
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function countWords(message){
	let words = message.split(' ');
	console.log(`* Message: ${message}`); 
  console.log(`* Word Count: ${words.length}`);
  return words.length;
}