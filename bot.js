var fs = require('fs');
var crypto = require('crypto');
var Steam = require('steam');
var request = require("request");
var mysql = require('mysql');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory
var readline = require('readline');
//var SteamTotp = require('steam-totp');
var winston = require('winston');
winston.add(winston.transports.File, { filename: 'botlogs.log' })

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var logOnOptions = {};
rl.question("Tell me your mobile authCode please :) ", function(answer) {
	//var code = SteamTotp.generateAuthCode('R97520');
	logOnOptions = {
		account_name: 'tikowski99',
		password: 'asdqwezxc9182',
		two_factor_code: answer
	};
	console.log("Thank you :D");
	steamClient.connect();
	
	rl.close();
});

/* mysql */

var mysqlInfo = {
  host     : 'localhost',
  user     : 'root',
  password : 'tspeak123',
  database : 'jackpot',
  charset  : 'utf8_general_ci'
};
 
var mysqlConnection = mysql.createConnection(mysqlInfo);

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
var apiKey;

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var online = 0;
var time = 0;
var shouldtime = 0;

	function loop(){
		
		if(time > shouldtime){
			time = shouldtime;
		}
		
		if(time == 0 && shouldtime != 0){
			time=shouldtime;
		}
		
		if(time != 0){
			io.emit('coutDown', { for: 'everyone' , time: (time/1000)});
			time -= 1000;
			if(time == 0){
				shouldtime = 0;
				
				
			var params = {
				uri: 'http://localhost/getSkins.php',
				json: true
			};
			var list = [];// {id: 234234, money: 1.13}
			var perList = [];
			var allprice = 0;
			var counting = 0;
			var json;
						
			request(params, function(error, response, body){
				if(!error && response.statusCode === 200){
					body = body.substr(1);
					json = JSON.parse(body);
					for(var i = 0; i < json.length ; i++){
						var id = json[i].userid;
						var price = json[i].price;
						allprice += parseFloat(price);
						var currmoney = 0;
						
						var contains = false;
						for(var w = 0; w < list.length ; w++){
							if(list[w].id == id){
								contains = true;
								currmoney = parseFloat(list[w].money);
								list.splice(w, 1);
							}
						}
						
						if(!contains){
							list.push({id: id, money: price});
						}
						else{
							currmoney += parseFloat(price);
							list.push({id: id, money: currmoney});
						}
					}
										
				}
			});
				
			setTimeout(function(){
				
			for(var i=0 ; i < list.length ; i++){
				var percent = (list[i].money/allprice)*10000;
				var start = counting;
				var end = counting + parseInt(percent);
				perList.push({id: list[i].id, start: start, end: end});
				counting = end;
			}
			
			var result = Math.random() * (counting - 0) + 0;
			var winner;
			var percentWinner = 0;
			
			for(var i=0 ; i < perList.length ; i++){
				if(perList[i].start <= result){
					if(perList[i].end >= result){
					winner = perList[i].id;
					percentWinner = (perList[i].end - perList[i].start)/100;
					break;
					}
				}
			}
			
			//dla kezdego *100 i przedzialy zrobic i potem randomowa liczbe ze wszystkiego i w ktorym przeedziale bedzie sie miescila
			io.emit('startLottery', { for: 'everyone' , winner: winner});
			
			//zabieranie 10% i konczenie rundy
			var tax = allprice*0.1;
			var currTaxPrice = 0;
			var currTax = [];
						
			for(var i=0 ; i < json.length ; i++){
					var price = Number(json[i].price);
					var name = json[i].name;
					if((currTaxPrice+price) <= tax){
						currTaxPrice += price;
						var amount = 1;
						
						for(var g=0 ; g < currTax.length ; g++){
							var name1 = currTax[g];
							if(name1 === name){
								amount++;
							}
						}
						
						currTax.push({name: name, amount: amount});
					}
			}
			
			
			var toSend = [];
			for(var i=0 ; i < json.length ; i++){
				var name = json[i].name;
				var contains = false;
				
				//czy jest w podatku
					for(var g=0 ; g < currTax.length ; g++){
						var name1 = currTax[g].name;
						if(name1 === name){
							contains = true;
							var amount = currTax[g].amount - 1;
							currTax.splice(g, 1);
							if(amount != 0){
							currTax.push({name: name, amount: amount});
							}
							break;
						}
					}
					
					
				if(!contains){
					var cont = false;
					
					for(var g=0 ; g < toSend.length ; g++){
						var name1 = toSend[g].name;
						if(name1 === name){
							cont = true;
							var amount = toSend[g].amount + 1;
							toSend.splice(g, 1);
							toSend.push({name: name, amount: amount});
						}
					}
					
					if(!cont){
						toSend.push({name: name, amount: 1});
					}
					
				}
				
			}
			
			var token;
			var partnerid;
			var gameid;
			var items = "";
			/* items structure = <market_name>/<amount>+<market_name>/<amount>+<market_name>/<amount> ... */
			
			for(var i=0 ; i < toSend.length ; i++){
				items = items + toSend[i].name + "/" + toSend[i].amount + "+";
			}
			items = items.substring(0, items.length - 1);
			
			mysqlConnection.query("SELECT * FROM `users` WHERE `steamid`='"+winner+"'", function(err, row, fields) {
				if(row.length != 1){
					console.log('Error: Winner does not have his tradeUrl set.');
				}
				else{
					token = row[0].token;
					partnerid = row[0].partnerid;
				}
			});
			
			mysqlConnection.query("SELECT * FROM `games`", function(err, row, fields) {
				gameid = row.length + 1;
			});
						
			
			setTimeout(function(){
mysqlConnection.query("INSERT INTO `games` (`id`, `skins_amount`, `skins_price`, `winner`, `percent`) VALUES ('"+gameid+"', '"+json.length+"', '"+allprice+"', '"+winner+"', '"+percentWinner+"')", function(err, row, fields) {});
mysqlConnection.query("INSERT INTO `queue` (`gameid`, `partnerid`, `token`, `items`, `status`) VALUES ('"+gameid+"', '"+partnerid+"', '"+token+"', '"+items+"', '1')", function(err, row, fields) {});


			//czyszczenie na nowa runde - taki uposledzony sposob jakby ktos wrzucil item podczas losowania juz to zeby mu nie znikl
			var currgame = [];
			mysqlConnection.query("SELECT * FROM `currgame`", function(err, row, fields) {
				for(var i=0 ; i < row.length ; i++){
					currgame.push({id: row[i].id, userid: row[i].userid, username: row[i].username, item: row[i].item, price: row[i].price, color: row[i].color, itemimg: row[i].itemimg, avatar: row[i].avatar});
				}
			});
			
			mysqlConnection.query("TRUNCATE TABLE `currgame`", function(err, row, fields) {});
			
			var id = 1;
			
			for(var i = json.length ; i < currgame.length ; i++){
mysqlConnection.query("INSERT INTO `currgame` (`id`, `userid`, `username`, `item`, `price`, `color`, `itemimg`, `avatar`) VALUES ('"+id+"', '"+currgame[i].userid+"', '"+currgame[i].username+"', '"+currgame[i].item+"', '"+currgame[i].price+"', '"+currgame[i].color+"', '"+currgame[i].itemimg+"', '"+currgame[i].avatar+"')", function(err, row, fields) {});
				id++;
			}

			}, 2000);
			
			
			}, 1000);
			}
		}
		setTimeout(loop, 1000);
	}
	loop();

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

io.on('connection', function(socket){
	online++;
  
    socket.on('disconnect', function(){
		online--;
  });
  
  var listCd = [];
	//chat zrobic se liste i cooldown w wiadomosciach i wysylanie do wszystkich #izi
	socket.on('chatMsg', function(data){
		var cooldown = false;
		for(var i=0 ; i < listCd.length ; i++){
			if(listCd[i] == data.id){
				cooldown = true;
				break;
			}
		}
		
		if(cooldown){
			//wiadomosc ze cooldown
			
			socket.emit('newChatMsg', { nick: "Chat Bot", msg: "Za szybko wysyłasz wiadomości!"});
			
		}
		else{
			//wyslac wiadomosc do czatu
			listCd.push(data.id);
			io.emit('newChatMsg', { for: 'everyone' , nick: data.nick, msg: data.msg});
			setTimeout(function(){
				for(var i=0 ; i < listCd.length ; i++){
					if(listCd[i] == data.id){
						listCd.splice(i, 1);
						break;
					}
				}
			}, 10000);
		}
	});
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

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
		  apiKey = APIKey;
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
			winston.log('info', 'Przyjmuje  trejda');
					var notcsgo = false;
					var gotprice = true;
					var cantmatch = false;
					var finderror = false;
					var errorgeneral = false;
					var tradehold = false;
					var items=[];
			
					var msg = offer.message;
					var partnerId = offer.steamid_other;
					var avatar;
					var name;
			
					getUserInfo(offer.steamid_other, function(error, data){
						if(error) throw error;
						var datadec = JSON.parse(JSON.stringify(data.response));
                        name = addslashes(datadec.players[0].personaname);
                        avatar = (datadec.players[0].avatarfull);
					});
					offers.getTradeHoldDuration(offer, function(err, data){
						if(err){
							//decline bo error
							tradehold = true;
							offers.declineOffer({tradeOfferId: offer.tradeofferid});
							console.log('*- [Trade Declined] -* Reason: An error occured while getting trade hold duration.');
							var newid = 0;
							mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
								if(row != null){
								newid = row.length;
								newid++;
								}
								mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Wystąpił błąd podczas sprawdzania oferty wymiany!(TradeHoldDuration)\',\'1\')', function(err, row, fields) {});
							});
						return;
						}
						else{
							//decilne jezeli czas zbyt duzy
							var timethey = data.their;
							var timemy = data.my;
							if(timethey > 0){
								tradehold = true;
								offers.declineOffer({tradeOfferId: offer.tradeofferid});
								console.log('*- [Trade Declined] -* Reason: Trade hold duration is too long(propably mobile auth fault).');
								var newid = 0;
								mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
									if(row != null){
										newid = row.length;
										newid++;
									}
									mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Oferta jest wstrzymana przez Steam na zbyt długi czas!\',\'1\')', function(err, row, fields) {});
								});
								return;
							}
						}
					});
					
					// my items!
					if(offer.items_to_give != null){
							offers.declineOffer({tradeOfferId: offer.tradeofferid});
							console.log('*- [Trade Declined] -* Reason: Attempt of steal bot-s items.');
							var newid = 0;
							mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
								if(row != null){
								newid = row.length;
								newid++;
								}
								mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Do not try to steal our items!\',\'1\')', function(err, row, fields) {});
							});
						return;
					}
					
					//limit 10 skinow
					
					var params = {
						uri: 'http://localhost/getSkins.php',
						json: true
					};
					
					var before_skins = 0;
							
					request(params, function(error, response, body){
						if(!error && response.statusCode === 200){
							body = body.substr(1);
							var json = JSON.parse(body);
							var list = [];
						for(var i = 0; i < json.length ; i++){
							var id = json[i].userid;
						
							var amount = 0;
							for(var w = 0; w < list.length ; w++){
								if(list[w].id == id){
									amount = list[w].amount;
									list.splice(w, 1);
									break;
								}
							}
							amount++;
							
							list.push({
								id: id, amount: amount
							});
							}
							
						for(var i = 0; i < list.length ; i++){
							if(list[w].id == partnerId){
								before_skins = list[w].amount;
							}
						}
						}
					});
					
					if((offer.items_to_receive.length + before_skins) > 10){
							offers.declineOffer({tradeOfferId: offer.tradeofferid});
							console.log('*- [Trade Declined] -* Reason: Limit of 10 skins reached.');
							var newid = 0;
							mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
								if(row != null){
								newid = row.length;
								newid++;
								}
								mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Reached limit of skins send by one player(10)\',\'1\')', function(err, row, fields) {});
							});
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
									var newid = 0;
									mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
										if(row != null){
										newid = row.length;
										newid++;
										}
										mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'We only accept CS:Go items!\',\'1\')', function(err, row, fields) {});
									});
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
									var newid = 0;
									mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
										if(row != null){
										newid = row.length;
										newid++;
										}
										mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Can not match send items - Bot error!\',\'1\')', function(err, row, fields) {});
									});
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
												mysqlConnection.query('INSERT INTO `messages` (`steamid`,`message`,`status`) VALUES (\''+partnerId+'\',\'Can not get items price - propably steam error!\',\'1\')', function(err, row, fields) {});
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
												var newid = 0;
												mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
													if(row != null){
													newid = row.length;
													newid++;
													}
													mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid+'\',\''+partnerId+'\',\'Can not get items price - propably steam error!\',\'1\')', function(err, row, fields) {});
												});
												return;
											}
									});
									
                                })(i)				
										
							}
						}, 2000);
							
						});
						
				
					setTimeout(function() {
						
							
						
						if(notcsgo == false && gotprice == true && cantmatch == false && finderror == false && errorgeneral == false && tradehold == false){
							offers.acceptOffer({tradeOfferId: offer.tradeofferid});
							//offers.declineOffer({tradeOfferId: offer.tradeofferid});
							io.emit('addUser', { for: 'everyone' , id: partnerId, avatar: avatar});
							
							var amount = 0;
							var newid = 0;
							mysqlConnection.query('SELECT * FROM `currgame`', function(err, row, fields) {
								if(row != null){
								newid = row.length;
								newid++;
								}

								items.forEach(function(item){
									
									var url = "http://steamcommunity-a.akamaihd.net/economy/image/";
									var img_url = url.concat(item.icon_url);
									
									mysqlConnection.query('INSERT INTO `currgame` (`id`,`userid`,`username`,`item`,`price`,`color`,`itemimg`,`avatar`) VALUES (\''+newid+'\',\''+partnerId+'\',\''+name+'\',\''+item.market_name+'\',\''+item.price+'\',\''+item.name_color+'\',\''+img_url+'\',\''+avatar+'\')', function(err, row, fields) {});
									newid++;
									amount += item.price;
								});
							
							});
							
							setTimeout(function(){
							//console.log('*- [Trade Accepted] -* Items: ' + items.length + ', $$: ' + amount);
							winston.log('info', '*- [Trade Accepted] -* Items: ' + items.length + ', $$: ' + amount);
								var params = {
									uri: 'http://localhost/getSkins.php',
									json: true
								};
							
							request(params, function(error, response, body){
									if(!error && response.statusCode === 200){
										body = body.substr(1);
										var json = JSON.parse(body);
										var amount = json.length;
										var list = [];
										
										for(var i = 0; i < amount ; i++){
											var id = json[i].userid;
						
											var contains = false;
											for(var w = 0; w < list.length ; w++){
												if(list[w] == id){
													contains = true;
												}
											}
						
											if(!contains){
												list.push(id);
											}
										}
										
										var value1 = (amount)/13;
										var value2 = (list.length)/3;
					
										var per = ((value1 + value2)/2)*100;
										per = parseInt(per);
										
										if(per >= 100){
											if(list.length < 5){
												shouldtime = 60000;
											}
											else if(list.length >= 5 && list.length <= 8){
												shouldtime = 30000;
											}
											else{
												shouldtime = 10000;
											}
										}
										else{
											shouldtime = 0;
										}
										
										
									}
									else{
										console.log('Error while calling getSkins.php');
									}
								
							});
							
							}, 2000);
							var newid1 = 0;
							mysqlConnection.query('SELECT * FROM `messages`', function(err, row, fields) {
								if(row != null){
								newid1 = row.length;
								newid1++;
								}
								
								mysqlConnection.query('INSERT INTO `messages` (`id`, `steamid`,`message`,`status`) VALUES (\''+newid1+'\',\''+partnerId+'\',\'Items added!\',\'1\')', function(err, row, fields) {});
							});
						}
							
					}, 6000);

			
        }
      });
    }
  });
}

function sendoffers(){
	    offers.loadMyInventory({
                appId: 730,
                contextId: 2
        }, function(err, itemx) {
			mysqlConnection.query('SELECT * FROM `queue` WHERE `status`=\'1\'', function(err, row, fields) {

			       for(var i=0; i < row.length; i++) {
						var gameid = row[i].gameid;
						var steamid = row[i].partnerid;
						var token = row[i].token;
/* items structure = <market_name>/<amount>+<market_name>/<amount>+<market_name>/<amount> ... */
						var itemsSplit = (row[i].items).split('+');
						var itemsToSend = [];
						
						itemsSplit.forEach(function(item){
							var itemSplit = item.split('/');
							
							var singleObj = itemSplit[0];
							var amount = itemSplit[1];
							for( var g=0 ; g < amount ; g++){
								itemsToSend.push(singleObj);
							}
						});
						
						var item=[],num=0;
						
						
						//passing items
						for(var s=0; s < itemsToSend.length ; s++){
								var name = itemsToSend[s];
								if(name.indexOf("StatTrak") > -1){
									name = name.fixIt("t");
								}
							for(var x=0; x < itemx.length ; x++){
								
								var name1 = itemx[x].market_name;
								if(name1.indexOf("StatTrak") > -1){
									name1 = name1.fixIt2("t");
								}

								if(itemx[x].tradable && name === name1){
							        item[num] = {
                                    appid: 730,
                                    contextid: 2,
                                    amount: 1,
                                    assetid: itemx[x].id
                                    }
									num++;
									itemx.splice(x, 1);
									x--;
									break;
								}
							}
						}
						
						if (num > 0) {
							offers.makeOffer({
								partnerAccountId: steamid,
                                itemsFromMe: item,
                                accessToken: token,
                                itemsFromThem: [],
                                message: 'Your winnings from Csgoeasypot.com Game #'+gameid
                            }, function(err, response){
                                if (err) {
									console.log('*- [Trade Send] -* Error!!!'+response+err);
                                    return;
                                    }
                                mysqlConnection.query('UPDATE `queue` SET `status`=\'0\' WHERE `gameid`=\''+gameid+'\'', function(err, row, fields) {});
                                console.log('*- [Trade Send] -* Game:' +gameid);
                            });
                        }
						
				   }
			});
			
		});
		setTimeout(sendoffers, 30000);
}
setTimeout(function(){
	sendoffers();
}, 50000);

steamUser.on('tradeOffers', function(number) {
	winston.log('info', 'onTradeOffers: ' + number);
  if (number > 0) {
    handleOffers();
  }
});

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}

function getUserInfo(steamids,callback) {
        var url = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key='+apiKey+'&steamids='+ steamids + '&format=json';
        request({
                url: url,
                json: true
        }, function(error, response, body){
                if(!error && response.statusCode === 200){
                        callback(null, body);
                } else if (error) {
                        getUserInfo(steamids,callback);
                }
        });
}

function addslashes(str) {
    str=str.replace(/\\/g,'\\\\');
    str=str.replace(/\'/g,'\\\'');
    str=str.replace(/\"/g,'\\"');
    str=str.replace(/\0/g,'\\0');
        return str;
}
String.prototype.fixIt=function(character) {
    return this.substr(0, 8) + character + " " + this.substr(8+character.length);
}
String.prototype.fixIt2=function(character) {
	
    return this.substr(0, 8) + character + this.substr(8+character.length);
}