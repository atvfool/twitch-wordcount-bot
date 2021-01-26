const tmi = require('tmi.js');
const { clear } = require('tmi.js/lib/commands');
const _ = require('lodash');
const util = require('util');
const https = require('https');
const querystring = require('querystring');

process.env.NODE_ENV = 'development';

const config = require('./config.json');
const { exit } = require('process');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);

globalThis.gConfig = finalConfig;
let is_channel_live = false;
// Define configuration options
const opts = {
  identity: {
    username: global.gConfig.identity.username,
    password: global.gConfig.identity.password,
    api_client_id: global.gConfig.identity.api_client_id,
    api_client_secret: global.gConfig.identity.api_client_secret
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

// check channel status every 30 seconds
setInterval(checkChannelStatus, 30000);
setInterval(sayChannelStatus, 15000);

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
      //client.deletemessage(target, context["id"]);
      //client.say(target, `${context["username"]} Please use longer sentences.`);
    }
    console.log(`* Unknown command ${commandName}`);
  }
}
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  console.log(`Channels: ${client.getChannels()}`);
}

function countWords(message){
	let words = message.split(' ');
	console.log(`* Message: ${message}`); 
  console.log(`* Word Count: ${JSON.stringify(words.length)}`);
  return words.length;
}

function sayChannelStatus(){
  if(!is_channel_live)
    client.say(global.gConfig.channels[0], `F`);
    console.log("F");
}

function checkChannelStatus(){
  let access_token = '';
  // Get access
  performRequest("id.twitch.tv", "/oauth2/token", "POST", {
    client_id: global.gConfig.identity.api_client_id,
    client_secret: global.gConfig.identity.api_client_secret,
    grant_type: 'client_credentials'
  }, {}, function(data){
    // if success then check the stream status
    access_token = data.access_token;

    performRequest("api.twitch.tv", "/helix/streams", "GET", {
      user_login: `${global.gConfig.channels[0].trim().replace('#', '')}`
    }, {
      'client-id':global.gConfig.identity.api_client_id,
      'Authorization':'Bearer ' + access_token
    }, function(data){
      if(data.data.length > 0)
        is_channel_live = true;
      else
        is_channel_live = false;
    });
  });
}

function performRequest(host, endpoint, method, data, headers, success) {
  var dataString = JSON.stringify(data);
  
  endpoint += '?' + querystring.stringify(data);
  var options = {
    host: host,
    path: endpoint,
    method: method,
    headers: headers
  };
  //console.log(options);
  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      // console.log(responseString);
      var responseObject = JSON.parse(responseString);
      success(responseObject);
    });
  });

  req.write(dataString);
  req.end();
}