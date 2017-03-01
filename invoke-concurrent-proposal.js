/**
 * Copyright 2017 Jingdong All Rights Reserved.
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
/*
 * Used for testing fabric invoke concurrency
 */

'use strict';

var log4js = require('log4js');
var logger = log4js.getLogger('INVOKE');

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

// Set suffix of TraceInfo that used in concurrent proposal
// e.g. fillArrayWithNumbers(1, 3, 1) returns array [1, 2, 3],
// then TraceInfo 'Concurrent transaction. TraceInfo 1/2/3' are used in 3 proposals 
var total_invoke_number = 3;
var success_num = 0;
var traceinfo_suffix_arr = fillArrayWithNumbers(1, total_invoke_number, 1);

hfc.newDefaultKeyValueStore({
	path: config.keyValueStore
}).then(function(store) {
	client.setStateStore(store);
	return helper.getSubmitter(client);
}).then(
	function(admin) {
		logger.info('Continue to executing Invoke');
		
		tx_id = helper.getTxId();//'initId, to be overwrite';
		var nonce = utils.getNonce();
		var args = helper.getArgs(config.invokeRequest.args);
		// send proposal to endorser
		var request = {
			chaincodeId: config.chaincodeID,
			fcn: config.invokeRequest.functionName,
			args: args,
			chainId: config.channelID,
			txId: tx_id,
			nonce: nonce
		};

		// Send concurrent proposal. async.map is concurrent while async.mapSeries is series execution.
		async.map(traceinfo_suffix_arr, function(item, callback) {
		//async.mapSeries(traceinfo_suffix_arr, function(item, callback) {
			tx_id = helper.getTxId();
		    request.txId = tx_id;
		    request.args[3] = 'Concurrent transaction. TraceInfo #' + item.toString();
		    logger.debug('txId to be sent: ' + request.txId);
		    logger.debug('TraceInfo to be sent: ' + request.args[3]);
			    
		    // Send individual proposal
		    chain.sendTransactionProposal(request)
		    .then(
	    		function(results) {
	    			logger.info('Invoke #' + item + ': successfully obtained proposal responses from endorsers');
	    			//console.dir(results[0][0].response.status);
	    			//console.dir(results[1]);
	    			//console.dir(results[2].chainHeader.txID);
	    			//console.dir(tx_id);
	    			
	    			// Parse received endorsement and then send promise to commit the transaction
	    			helper.processProposal(tx_id, eventhub, chain, results, 'addNewTrade')
	    			.then(
	    				function(response) {
	    	    			if (response.status === 'SUCCESS') {
	    	    				logger.info('Invoke #' + item + ' successfully committed');
	    				        callback(null, 'Invoke #' + item + ' successfully committed');
	    					} else {
	    						// No error should cause callback so that all response could be processed
	    						logger.error('Invoke #' + item + ': failed to commit chaincode transaction. Error code: ' + response.status);
	    					}
	    	    		}		
	    			);
	    		}
		    );
		}, function(err, results) {
			logger.debug('Get callback.');
			console.dir('############### Query Statistics #####################');
			console.dir(results);
			console.dir('######################################################');
			console.log('Concurrency success rate: ' + results.length/total_invoke_number + ' with concurrent number: ' + total_query_number);
			console.dir('######################################################');
			logger.debug('Existing process...');
			process.exit();			
			
			
		});		
	}
).catch(
	function(err) {
		eventhub.disconnect();
		logger.error('Failed to invoke transaction due to error: ' + err.stack ? err.stack : err);
	}
);