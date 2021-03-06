'use strict';
/* global process */
/* global __dirname */
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved. 
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *******************************************************************************/
/////////////////////////////////////////
///////////// Setup Node.js /////////////
/////////////////////////////////////////
var express = require('express');
var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var url = require('url');
var setup = require('./setup');
var cors = require('cors');

//// Set Server Parameters ////
var host = setup.SERVER.HOST;
var port = setup.SERVER.PORT;

////////  Pathing and Module Setup  ////////
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('.html', require('jade').__express);
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded()); 
app.use(cookieParser());
app.use('/cc/summary', serve_static(path.join(__dirname, 'cc_summaries')) );												//for chaincode investigator
app.use( serve_static(path.join(__dirname, 'public'), {maxAge: '1d', setHeaders: setCustomCC}) );							//1 day cache
//app.use( serve_static(path.join(__dirname, 'public')) );
app.use(session({secret:'Somethignsomething1234!test', resave:true, saveUninitialized:true}));
function setCustomCC(res, path) {
	if (serve_static.mime.lookup(path) === 'image/jpeg')  res.setHeader('Cache-Control', 'public, max-age=2592000');		//30 days cache
	else if (serve_static.mime.lookup(path) === 'image/png') res.setHeader('Cache-Control', 'public, max-age=2592000');
	else if (serve_static.mime.lookup(path) === 'image/x-icon') res.setHeader('Cache-Control', 'public, max-age=2592000');
}
// Enable CORS preflight across the board.
app.options('*', cors());
app.use(cors());

///////////  Configure Webserver  ///////////
app.use(function(req, res, next){
	var keys;
	console.log('------------------------------------------ incoming request ------------------------------------------');
	console.log('New ' + req.method + ' request for', req.url);
	req.bag = {};											//create my object for my stuff
	req.bag.session = req.session;
	
	var url_parts = url.parse(req.url, true);
	req.parameters = url_parts.query;
	keys = Object.keys(req.parameters);
	if(req.parameters && keys.length > 0) console.log({parameters: req.parameters});		//print request parameters
	keys = Object.keys(req.body);
	if (req.body && keys.length > 0) console.log({body: req.body});						//print request body
	next();
});

//// Router ////
app.use('/', require('./routes/site_router'));

////////////////////////////////////////////
////////////// Error Handling //////////////
////////////////////////////////////////////
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
app.use(function(err, req, res, next) {		// = development error handler, print stack trace
	console.log('Error Handeler -', req.url);
	var errorCode = err.status || 500;
	res.status(errorCode);
	req.bag.error = {msg:err.stack, status:errorCode};
	if(req.bag.error.status == 404) req.bag.error.msg = 'Sorry, I cannot locate that file';
	res.render('template/error', {bag:req.bag});
});

// ============================================================================================================================
// 														Launch Webserver
// ============================================================================================================================
var server = http.createServer(app).listen(port, function() {});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'production';
server.timeout = 240000;																							// Ta-da.
console.log('------------------------------------------ Server Up - ' + host + ':' + port + ' ------------------------------------------');
if(process.env.PRODUCTION) console.log('Running using Production settings');
else console.log('Running using Developer settings');

// ============================================================================================================================
// 														Deployment Tracking
// ============================================================================================================================
console.log('- Tracking Deployment');
require('cf-deployment-tracker-client').track();		//reports back to us, this helps us judge interest! feel free to remove it

// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================

// ============================================================================================================================
// 														Warning
// ============================================================================================================================

// ============================================================================================================================
// 														Entering
// ============================================================================================================================

// ============================================================================================================================
// 														Test Area
// ============================================================================================================================
var part1 = require('./utils/ws_part1');
var part2 = require('./utils/ws_part2');
var ws = require('ws');
var wss = {};
var Ibc1 = require('ibm-blockchain-js');
var ibc = new Ibc1();

// ==================================
// load peers manually or from VCAP, VCAP will overwrite hardcoded list!
// ==================================
//this hard coded list is intentionaly left here, feel free to use it when initially starting out
//please create your own network when you are up and running
var manual ={

  "credentials": {
    "peers": [
      {
        "discovery_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp1-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp1-api.blockchain.ibm.com",
        "api_port_tls": 443,
        "api_port": 80,
        "type": "peer",
        "network_id": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee",
        "container_id": "c302f68ff9b5bb1aac5b31dfc4beb044d65aa1b3cef20e529464c111a919df51",
        "id": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp1",
        "api_url": "http://30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp1-api.blockchain.ibm.com:80"
      },
      {
        "discovery_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp2-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp2-api.blockchain.ibm.com",
        "api_port_tls": 443,
        "api_port": 80,
        "type": "peer",
        "network_id": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee",
        "container_id": "23b120ece4499e40acc8912f7ebae92bd19002431b318771d8e5373b6acce531",
        "id": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp2",
        "api_url": "http://30a7cdec-b29f-4ee9-91fe-e9064e3945ee_vp2-api.blockchain.ibm.com:80"
      }
    ],
    "ca": {
      "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_ca": {
        "url": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_ca-api.blockchain.ibm.com:30303",
        "discovery_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_ca-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee_ca-api.blockchain.ibm.com",
        "api_port_tls": 30303,
        "api_port": 80,
        "type": "ca",
        "network_id": "30a7cdec-b29f-4ee9-91fe-e9064e3945ee",
        "container_id": "40ae83bd0a565a027a39c48d72dbe93b6542f442875cc832b1e3a7fb4b47e643"
      }
    },
    "users": [
       {
        "username": "user_type1_1706e2f7dc",
        "secret": "1b28fdc49c",
        "enrollId": "user_type1_1706e2f7dc",
        "enrollSecret": "1b28fdc49c"
      },
      {
        "username": "user_type1_c6032e5c8b",
        "secret": "0df39bc78b",
        "enrollId": "user_type1_c6032e5c8b",
        "enrollSecret": "0df39bc78b"
      },
      {
        "username": "user_type1_6e6c48961e",
        "secret": "ab5e98d129",
        "enrollId": "user_type1_6e6c48961e",
        "enrollSecret": "ab5e98d129"
      },
      {
        "username": "user_type1_ab8e444308",
        "secret": "3793c13790",
        "enrollId": "user_type1_ab8e444308",
        "enrollSecret": "3793c13790"
      },
      {
        "username": "user_type1_9930d1ebd8",
        "secret": "a85b6378f6",
        "enrollId": "user_type1_9930d1ebd8",
        "enrollSecret": "a85b6378f6"
      },
      {
        "username": "user_type2_c721c59b62",
        "secret": "0d2200793d",
        "enrollId": "user_type2_c721c59b62",
        "enrollSecret": "0d2200793d"
      },
      {
        "username": "user_type2_f35b1d5b17",
        "secret": "4be7b3155a",
        "enrollId": "user_type2_f35b1d5b17",
        "enrollSecret": "4be7b3155a"
      },
      {
        "username": "user_type2_a418ebfeeb",
        "secret": "9998289d47",
        "enrollId": "user_type2_a418ebfeeb",
        "enrollSecret": "9998289d47"
      },
            {
        "username": "user_type4_fe4ab04291",
        "secret": "493d1043c4",
        "enrollId": "user_type4_fe4ab04291",
        "enrollSecret": "493d1043c4"
      },
      {
        "username": "user_type8_8c2e78d937",
        "secret": "63ae87cabc",
        "enrollId": "user_type8_8c2e78d937",
        "enrollSecret": "63ae87cabc"
      },
      {
        "username": "user_type8_df6ce53570",
        "secret": "734e32b9a2",
        "enrollId": "user_type8_df6ce53570",
        "enrollSecret": "734e32b9a2"
      },
      {
        "username": "user_type8_15172897c2",
        "secret": "e1243cea16",
        "enrollId": "user_type8_15172897c2",
        "enrollSecret": "e1243cea16"
      },
      {
        "username": "user_type8_ffdc8a0906",
        "secret": "fd5f43a563",
        "enrollId": "user_type8_ffdc8a0906",
        "enrollSecret": "fd5f43a563"
      },
      {
        "username": "user_type8_251c2806bc",
        "secret": "5f3eca184b",
        "enrollId": "user_type8_251c2806bc",
        "enrollSecret": "5f3eca184b"
      }
    ]
}
};
var peers = manual.credentials.peers;
console.log('loading hardcoded peers');
var users = null;																		//users are only found if security is on
if(manual.credentials.users) users = manual.credentials.users;
console.log('loading hardcoded users');

if(process.env.VCAP_SERVICES){															//load from vcap, search for service, 1 of the 3 should be found...
	var servicesObject = JSON.parse(process.env.VCAP_SERVICES);
	for(var i in servicesObject){
		if(i.indexOf('ibm-blockchain') >= 0){											//looks close enough
			if(servicesObject[i][0].credentials.error){
				console.log('!\n!\n! Error from Bluemix: \n', servicesObject[i][0].credentials.error, '!\n!\n');
				peers = null;
				users = null;
				process.error = {type: 'network', msg: 'Due to overwhelming demand the IBM Blockchain Network service is at maximum capacity.  Please try recreating this service at a later date.'};
			}
			if(servicesObject[i][0].credentials && servicesObject[i][0].credentials.peers){
				console.log('overwritting peers, loading from a vcap service: ', i);
				peers = servicesObject[i][0].credentials.peers;
				if(servicesObject[i][0].credentials.users){
					console.log('overwritting users, loading from a vcap service: ', i);
					users = servicesObject[i][0].credentials.users;
				} 
				else users = null;														//no security
				break;
			}
		}
	}
}

// ==================================
// configure ibm-blockchain-js sdk
// ==================================
var options = 	{
					network:{
						peers: peers,
						users: users,
						options: {quiet: true, tls:false, maxRetry: 1}
					},
					chaincode:{
						//zip_url: 'https://github.com/ibm-blockchain/marbles-chaincode/archive/master.zip',
						zip_url: 'https://github.com/ibm-blockchain/eshnil2000/archive/master.zip',
						unzip_dir: 'marbles-chaincode-master/hyperledger/part2',								//subdirectroy name of chaincode after unzipped
						//git_url: 'https://github.com/ibm-blockchain/marbles-chaincode/hyperledger/part2',		//GO get http url
						git_url: 'https://github.com/eshnil2000/marbles-chaincode/hyperledger/part2',	
						//hashed cc name from prev deployment
						//deployed_name: '14b711be6f0d00b190ea26ca48c22234d93996b6e625a4b108a7bbbde064edf0179527f30df238d61b66246fe1908005caa5204dd73488269c8999276719ca8b'
					}
				};
if(process.env.VCAP_SERVICES){
	console.log('\n[!] looks like you are in bluemix, I am going to clear out the deploy_name so that it deploys new cc.\n[!] hope that is ok budddy\n');
	options.chaincode.deployed_name = '';
}
ibc.load(options, cb_ready);																//parse/load chaincode

var chaincode = null;
function cb_ready(err, cc){																	//response has chaincode functions
	if(err != null){
		console.log('! looks like an error loading the chaincode or network, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		chaincode = cc;
		part1.setup(ibc, cc);
		part2.setup(ibc, cc);
		if(!cc.details.deployed_name || cc.details.deployed_name === ''){					//decide if i need to deploy
			cc.deploy('init', ['99'], {save_path: './cc_summaries', delay_ms: 50000}, cb_deployed);
		}
		else{
			console.log('chaincode summary file indicates chaincode has been previously deployed');
			cb_deployed();
		}
	}
}

// ============================================================================================================================
// 												WebSocket Communication Madness
// ============================================================================================================================
function cb_deployed(e, d){
	if(e != null){
		//look at tutorial_part1.md in the trouble shooting section for help
		console.log('! looks like a deploy error, holding off on the starting the socket\n', e);
		if(!process.error) process.error = {type: 'deploy', msg: e.details};
	}
	else{
		console.log('------------------------------------------ Websocket Up ------------------------------------------');
		
		wss = new ws.Server({server: server});												//start the websocket now
		wss.on('connection', function connection(ws) {
			ws.on('message', function incoming(message) {
				console.log('received ws msg:', message);
				try{
					var data = JSON.parse(message);
					part1.process_msg(ws, data);
					part2.process_msg(ws, data);
				}
				catch(e){
					console.log('ws message error', e);
				}
			});
			
			ws.on('error', function(e){console.log('ws error', e);});
			ws.on('close', function(){console.log('ws closed');});
		});
		
		wss.broadcast = function broadcast(data) {											//send to all connections			
			wss.clients.forEach(function each(client) {
				try{
					data.v = '2';
					client.send(JSON.stringify(data));
				}
				catch(e){
					console.log('error broadcast ws', e);
				}
			});
		};
		
		// ========================================================
		// Monitor the height of the blockchain
		// ========================================================
		ibc.monitor_blockheight(function(chain_stats){										//there is a new block, lets refresh everything that has a state
			if(chain_stats && chain_stats.height){
				console.log('hey new block, lets refresh and broadcast to all');
				ibc.block_stats(chain_stats.height - 1, cb_blockstats);
				wss.broadcast({msg: 'reset'});
				chaincode.query.read(['_marbleindex'], cb_got_index);
				chaincode.query.read(['_opentrades'], cb_got_trades);
			}
			
			//got the block's stats, lets send the statistics
			function cb_blockstats(e, stats){
				if(e != null) console.log('error:', e);
				else {
					if(chain_stats.height) stats.height = chain_stats.height - 1;
					wss.broadcast({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
				}
			}
			
			//got the marble index, lets get each marble
			function cb_got_index(e, index){
				if(e != null) console.log('error:', e);
				else{
					try{
						var json = JSON.parse(index);
						for(var i in json){
							console.log('!', i, json[i]);
							chaincode.query.read([json[i]], cb_got_marble);							//iter over each, read their values
						}
					}
					catch(e){
						console.log('marbles index msg error:', e);
					}
				}
			}
			
			//call back for getting a marble, lets send a message
			function cb_got_marble(e, marble){
				if(e != null) console.log('error:', e);
				else {
					try{
						wss.broadcast({msg: 'marbles', marble: JSON.parse(marble)});
					}
					catch(e){
						console.log('marble msg error', e);
					}
				}
			}
			
			//call back for getting open trades, lets send the trades
			function cb_got_trades(e, trades){
				if(e != null) console.log('error:', e);
				else {
					try{
						trades = JSON.parse(trades);
						if(trades && trades.open_trades){
							wss.broadcast({msg: 'open_trades', open_trades: trades.open_trades});
						}
					}
					catch(e){
						console.log('trade msg error', e);
					}
				}
			}
		});
	}
}