var SteamCommunity = require('steamcommunity');
var SteamTotp = require('steam-totp');
var code = SteamTotp.generateAuthCode('MY_SECRET');
var client = new SteamCommunity();

client.login({
    "accountName": "LOGIN",
    "password": "PASSWORD",
    "twoFactorCode": code
}, function(err, sessionId, cookies, steamguard) {
	
var hash = require('crypto').createHash('sha1');
hash.update(Math.random().toString());
hash = hash.digest('hex');
var device_id = 'android:' + hash;
	
var SteamcommunityMobileConfirmations = require('steamcommunity-mobile-confirmations');
var steamcommunityMobileConfirmations = new SteamcommunityMobileConfirmations(
{
    steamid: "76561198249721196",
    identity_secret: "MY_SECRET",
    device_id: device_id,
    webCookie: cookies
});

acceptTrades();

function acceptTrades(){
steamcommunityMobileConfirmations.FetchConfirmations((function (err, confirmations)
{
    if (err)
    {
        console.log(err);
        return;
    }
    console.log('steamcommunityMobileConfirmations.FetchConfirmations received ' + confirmations.length + ' confirmations');
    if ( ! confirmations.length)
    {
        return;
    }
    steamcommunityMobileConfirmations.AcceptConfirmation(confirmations[0], (function (err, result)
    {
        if (err)
        {
            console.log(err);
            return;
        }
        console.log('steamcommunityMobileConfirmations.AcceptConfirmation result: ' + result);
    }));
}));
	setTimeout(acceptTrades, 10000);
}

})