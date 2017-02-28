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
var logger = log4js.getLogger('QUERY');
logger.setLevel('DEBUG');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');

var config = require('./config.json');
var helper = require('./helper.js');

var client = new hfc();
var chain;

init();

function init() {
	chain = client.newChain(config.chainName);
	chain.addOrderer(new Orderer(config.orderer.orderer_url));
	for (var i = 0; i < config.peers.length; i++) {
		chain.addPeer(new Peer(config.peers[i].peer_url));
	}
}

hfc.newDefaultKeyValueStore({
	path: config.keyValueStore
}).then(function(store) {
	client.setStateStore(store);
	return helper.getSubmitter(client);
}).then(
	function(admin) {
		logger.info('Successfully obtained enrolled user to perform query');

		logger.info('Executing Query');
		var targets = [];
		for (var i = 0; i < config.peers.length; i++) {
			targets.push(config.peers[i]);
		}
		var args = helper.getArgs(config.queryRequest.args);
		//chaincode query request
		var request = {
			targets: targets,
			chaincodeId: config.chaincodeID,
			chainId: config.channelID,
			txId: utils.buildTransactionID(),
			nonce: utils.getNonce(),
			fcn: config.queryRequest.functionName,
			args: args
		};
		// Query chaincode
		return chain.queryByChaincode(request);
	}
).then(
	function(response_payloads) {
		for (let i = 0; i < response_payloads.length; i++) {
			logger.info('############### Query results after the move on PEERi###############');
			response_payloads[i].toString('utf8').split(",").map(function (val) {  
				logger.info('%j ', val);
			});
			logger.info('############### Query ENDi##########################################\n');			
		}
	}
/*	
).then(
		function() {
			logger.info('Continue to test getPeers');

			// Get Peers, note it's not query
			logger.info('############### Peers:  %j', chain.getPeers().toString('utf8'));
		}		
).then(
		function() {
			logger.info('Continue to test getOrderers');

			// Get Orderers, note it's not query
			logger.info('############### Orderers:  %j', chain.getOrderers().toString('utf8'));
		}	
).then(
		function() {
			logger.info('Continue to test Client');
			
			// Get Chain, note it's not query
			logger.info('############### Chain info:  %j', client.getChain(config.chainName).toString('utf8'));
			// Get KeyValueStore, note it's not query
			logger.info('############### KeyValueStore: ');
			console.dir(client.getStateStore());
		}	
).then(
		function() {
			// Get UserContext, note it's not query
			var users = config.users;
			var username = users[0].username;
			return client.getUserContext(username);
		}	
).then(
		function(admin){
			logger.info('############### Username:  %j', admin.getName());
			logger.info('                isEnrolled:  %j', admin.isEnrolled());
			logger.info('                Roles:  %j', admin.getRoles());
			logger.info('                Affiliation:  %j', admin.getAffiliation());
			logger.info('                Identity id:  %j', admin.getIdentity()._id);
			logger.info('                Identity certificate:  %j', admin.getIdentity()._certificate);
			logger.info('                SigningIdentity id:  %j', admin.getSigningIdentity()._id);
			logger.info('                SigningIdentity certificate:  %j', admin.getSigningIdentity()._certificate);
			logger.info('                SigningIdentity public key:  %j', admin.getSigningIdentity()._publicKey._key.pubKeyHex);
			logger.info('                SigningIdentity private key:  %j', admin.getSigningIdentity()._publicKey._key.prvKeyHex);
		}
*/		
).catch(
	function(err) {
		logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
	}
);
