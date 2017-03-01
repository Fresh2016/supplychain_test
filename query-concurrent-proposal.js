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
logger.setLevel('INFO');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');

var config = require('./config.json');
var helper = require('./helper.js');
var async = require('async');

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

function fillArrayWithNumbers(start, end, interval) {
    var arr = Array.apply(null, Array(parseInt((end - start) / interval) + 1));
    return arr.map(function (x, i) { return start + i * interval});
}

// Set suffix of TraceInfo that used in concurrent proposal
// e.g. fillArrayWithNumbers(1, 3, 1) returns array [1, 2, 3],
// then TraceInfo 'Concurrent transaction. TraceInfo 1/2/3' are used in 3 proposals
var total_query_number = 10;
var success_num = 0;
var querynum_arr = fillArrayWithNumbers(1, total_query_number, 1);
var distribution_arr = [0, 0, 0, 0];

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
		//return chain.queryByChaincode(request);
		// Send concurrent proposal
		async.map(querynum_arr, function(item, callback) {
		    logger.debug('Concurrent query # ' + item.toString());
		    
		    // Send individual proposal
		    chain.queryByChaincode(request)
		    .then(
	    		function(response_payloads) {
	    			for (let i = 0; i < response_payloads.length; i++) {
	    				logger.info('############### Query #' + item + ' results from PEER%j ###############', i);
	    				response_payloads[i].toString('utf8').split(",").map(function (val) {  
	    					logger.info('%j ', val);
	    				});
	    				logger.info('############### Query END ##########################################\n');			
	    			}
	    			callback(null, 'Query #' + item + ' get responses number : ' + response_payloads.length);
	    		}		    		
		    );
		}, function(err, results) {
			logger.debug('Get callback.');
			console.dir('############### Query Statistics #####################');
			console.dir(results);
			console.dir('######################################################');
			for (let i = 0; i < results.length; i++) {
				var query_index = results[i].split('#')[1].split(' ')[0];
				var resp_num = results[i].split(': ')[1];
				if (resp_num > 0) success_num ++;
				if (resp_num <= distribution_arr.length) distribution_arr[resp_num] ++;
			}
			console.log('Concurrency success rate: ' + success_num/total_query_number + ' with concurrent number: ' + total_query_number);
			console.log('Response number distribution: [' + distribution_arr + ']');
			console.dir('######################################################');
			logger.debug('Existing process...');
			process.exit();
		});				
	}
).catch(
	function(err) {
		logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
	}
);
