/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
// This is Sample end-to-end standalone program that focuses on exercising all
// parts of the fabric APIs in a happy-path scenario
'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('DEPLOY');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var EventHub = require('fabric-client/lib/EventHub.js');

var config = require('./config.json');
var helper = require('./helper.js');

logger.setLevel('DEBUG');

var client = new hfc();
var chain;
var eventhub;
var tx_id = null;
var async = require('async');

process.env['HFC_LOGGING']='{"error": "error.log", "debug":"console", "info": "console"}';
logger.debug(process.env.HFC_LOGGING);

if (!process.env.GOPATH){
	process.env.GOPATH = config.goPath;
}
logger.debug(process.env.GOPATH);

init();

function init() {
	chain = client.newChain(config.chainName);
	chain.addOrderer(new Orderer(config.orderer.orderer_url));
	eventhub = new EventHub();
	eventhub.setPeerAddr(config.events[0].event_url);
	eventhub.connect();
	for (var i = 0; i < config.peers.length; i++) {
		chain.addPeer(new Peer(config.peers[i].peer_url));
	}
}

function fillArrayWithNumbers(start, end, interval) {
    var arr = Array.apply(null, Array(parseInt((end - start) / interval) + 1));
    return arr.map(function (x, i) { return start + i * interval});
}

// Set suffix of chaincodeID that used in concurrent proposal
// e.g. fillArrayWithNumbers(1, 3, 1) returns array [1, 2, 3],
// then chaincodeID deploytest1/2/3 are used in 3 proposals 
var chaincode_suffix_arr = fillArrayWithNumbers(13, 15, 1);

// Do enroll admin and send proposal in serial order
hfc.newDefaultKeyValueStore({
	path: config.keyValueStore
}).then(function(store) {
	client.setStateStore(store);
	return helper.getSubmitter(client);
}).then(
	function(admin) {
		logger.info('Successfully obtained enrolled user to deploy the chaincode');
		logger.info('Executing Deploy');
		
		tx_id = helper.getTxId();
		var nonce = utils.getNonce();
		var args = helper.getArgs(config.deployRequest.args);
		
		// Define proposal template
		var request = {
			chaincodePath: config.chaincodePath,
			chaincodeId: config.chaincodeID,
			fcn: config.deployRequest.functionName,
			args: args,
			chainId: config.channelID,
			txId: tx_id,
			nonce: nonce,
		};
		
		// Send concurrent proposal
		async.map(chaincode_suffix_arr, function(item, callback) {
		    request.chaincodeId = config.chaincodeID + item.toString();
		    logger.debug('request.chaincodeId: ' + request.chaincodeId);
		    
		    // Send individual proposal
		    chain.sendDeploymentProposal(request)
		    .then(
		    	function(results) {
			    	logger.debug('Callback deploy #' + item);
			    	//console.dir(results);
					var response = helper.processProposal(tx_id, eventhub, chain, results, 'deploy');
					if (response.status === 'SUCCESS') {
						logger.info('Successfully sent deployment transaction to the orderer.');
				        callback(null, results);
					} else {
						logger.error('Failed to order the deployment endorsement. Error code: ' + response.status);
				        callback('Failed to order the deployment endorsement. Error code: ' + response.status, null);
					}
			    }
		    );
		}, function(err, results) {
			logger.debug('Get callback.');
			logger.debug(err);
			logger.debug(results);
			logger.debug('Existing process...');
			process.exit();
		});
	}
).catch(
	function(err) {
		eventhub.disconnect();
		logger.error(err.stack ? err.stack : err);
	}
);
