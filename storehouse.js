var fs = require('fs');
var crypto = require('crypto');
var socket = require('socket.io');
var express = require('express');
var Steam = require('steam');
var request = require("request");
var http = require('http');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var logOnOptions = {
  account_name: 'tikupl',
  password: 'pandatiku987'
  //account_name: 'easypot1',
 // password: 'Easypot123'
};

var authCode = ''; // code received by email

try {
  logOnOptions.sha_sentryfile = getSHA1(fs.readFileSync('sentry'));
} catch (e) {
  if (authCode !== '') {
    logOnOptions.auth_code = authCode;
  }
}

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
var offers = new SteamTradeOffers();
var app = express();
var server = http.createServer(app);
var io = socket.listen(server);

//socket server
io.sockets.on('connection', function(client){
	console.log('New connection!');
	
	//send offer cmd
	client.on('send', function(data){
		console.log('Command recognized - send offer!');
		
		
		
	});
	
});

server.listen(8080);

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn(logOnOptions);
});

steamClient.on('logOnResponse', function(logonResp) {
  if (logonResp.eresult === Steam.EResult.OK) {
    console.log('Logged in!');
    steamFriends.setPersonaState(Steam.EPersonaState.Online);

    steamWebLogOn.webLogOn(function(sessionID, newCookie) {
		console.log("New sessionID: " + sessionID);
		console.log("New coockie: " + newCookie);
      getSteamAPIKey({
        sessionID: sessionID,
        webCookie: newCookie
      }, function(err, APIKey) {
		  console.log('APIKey: ' + APIKey);
        offers.setup({
          sessionID: sessionID,
          webCookie: newCookie,
          APIKey: APIKey
        });
      });
    });
  }
});

steamClient.on('servers', function(servers) {
  fs.writeFile('servers', JSON.stringify(servers));
});

steamUser.on('updateMachineAuth', function(sentry, callback) {
  fs.writeFileSync('sentry', sentry.bytes);
  callback({ sha_file: getSHA1(sentry.bytes) });
});

function handleOffers() {
  offers.getOffers({
    get_received_offers: 1,
    active_only: 1,
    time_historical_cutoff: Math.round(Date.now() / 1000)
  }, function(error, body) {
    if (
      body
      && body.response
      && body.response.trade_offers_received
    ) {
      body.response.trade_offers_received.forEach(function(offer) {
        if (offer.trade_offer_state === 2) {
			
					var notcsgo = false;
					var gotprice = true;
					var cantmatch = false;
					var finderror = false;
					var errorgeneral = false;
					var items=[];
			
					var msg = offer.message;
					var partnerId = offer.accountid_other;
			

					// my items!
					if(offer.items_to_give != null){
							offers.declineOffer({tradeOfferId: offer.tradeofferid});
							console.log('*- [Trade Declined] -* Reason: Attempt of steal bot-s items.');
						return;
					}
					

						//pass items from Partner eq to send items and check their price
						offers.loadPartnerInventory({
							partnerSteamId: offer.steamid_other, 
							appId: 730, 
							contextId: 2, 
							tradeOfferId: offer.tradeofferid, 
							}, function(err, eq) {

							var itemsh = offer.items_to_receive;
							var num = 0;
							
						   //loop items
							for (var i = 0; i < itemsh.length; i++) {
								//check if not cs:go item
								if(itemsh[i].appid != 730){
									offers.declineOffer({tradeOfferId: offer.tradeofferid});
									console.log('*- [Trade Declined] -* Reason: Not cs:go item.');
									notcsgo = true;
									return;
								}
								
								//pass items
								for(var j=0; j < eq.length; j++) {
									if(itemsh[i].assetid == eq[j].id) {
										items[num] = eq[j];
										num++;
										break;
									}
								}
								if(items[num-1] == null && cantmatch == false){
									offers.declineOffer({tradeOfferId: offer.tradeofferid});
									console.log('*- [Trade Declined] -* Reason: Cant match send item to items in Partner Eq!');
									cantmatch = true;
									return;
								}
                            }
						
							//add price
						setTimeout(function() {
							for(var i=0 ; i < items.length ; i++){


								var itemname = items[i].market_name;
								var params = {
									uri: 'http://steamcommunity.com/market/priceoverview/?currency=3&appid=730&market_hash_name='+encodeURIComponent(itemname),
									json: true
								};		
							
                                (function (id) {
									request(params, function(error, response, body){
										if(!error && response.statusCode === 200){				
											if(body.success == false){
												finderror = true;
												offers.declineOffer({tradeOfferId: offer.tradeofferid});
												console.log('*- [Trade Declined] -* Reason: Couldnt get item price.');
												return;
											}
												var str = body.lowest_price;
												str = str.substring(0, str.length - 1);
												str = str.replace(',', '.');
												
											items[id].price = +str;
			
											} else {
												errorgeneral = true;
												offers.declineOffer({tradeOfferId: offer.tradeofferid});
												console.log('*- [Trade Declined] -* Reason: Couldnt connect to steamAPI to get item price.');
												return;
											}
									});
									
                                })(i)				
										
										
								/*var ret = getPrice(items[i]);
								console.log('zwraca' + ret);
								
								setTimeout(function(ret) {
								console.log('cena tutaj: ' + ret);
								var error = ret[0];
								var finderror = ret[1];
								var price = ret[2];
								
								if(error == true){
									offers.declineOffer({tradeOfferId: offer.tradeofferid});
									console.log('*- [Trade Declined] -* Reason: An error occured or server response was not 200, while searching for prices.');
									gotprice = false;	
									return;
								}
								
								if(finderror == true){
									offers.declineOffer({tradeOfferId: offer.tradeofferid});
									console.log('*- [Trade Declined] -* Reason: Could not find price of the item.');
									gotprice = false;
									return;
								}
								
								items[i].price = price;
								
								}, 4000);*/
							}
						}, 8000); //<---- to do funkcji i zrobić | items[i].price = getPrice(items[i]);
							
						});
						
				
					setTimeout(function() {
							
						
						if(notcsgo == false && gotprice == true && cantmatch == false && finderror == false && errorgeneral == false){
							//offers.acceptOffer({tradeOfferId: offer.tradeofferid});
																offers.declineOffer({tradeOfferId: offer.tradeofferid});

							var amount = 0;
							
							items.forEach(function(item){
								amount += item.price;
							});
							
							console.log('*- [Trade Accepted] -* Items: ' + items.length + ', $$: ' + amount);
							
							io.sockets.emit('trade',
							{
								userid: partnerId,
								
								
							});
							//sockety do php i do bazydanych info o itemku
						}
							
					}, 12000);

			
        }
      });
    }
  });
}

steamUser.on('tradeOffers', function(number) {
  if (number > 0) {
    handleOffers();
  }
});

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}