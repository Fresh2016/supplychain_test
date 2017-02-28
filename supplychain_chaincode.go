/*
Copyright Jingdong 2017 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	//"bytes"
	"fmt"
    "os" 
	"strconv"
    "time"
    
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)


// Supply chain Chaincode implementation
type SupplyChaincode struct {
}


func main() {
	err := shim.Start(new(SupplyChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}


// Initialize chaincode, called by deploy.js
func (t *SupplyChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response  {
    
    fmt.Println("########### supplychain_chaincode Init ###########")

	_, args := stub.GetFunctionAndParameters()

	return t.addNewTrade(stub, args)
}


// Not supported anymore
func (t *SupplyChaincode) Query(stub shim.ChaincodeStubInterface) pb.Response {
		return shim.Error("Unknown supported call")
}


// Transaction include addNewTrade, queryTrade, and (TODO) getTradeHistory
func (t *SupplyChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    
    fmt.Println("########### supplychain_chaincode Invoke ###########")
	function, args := stub.GetFunctionAndParameters()
	fmt.Printf("Invoke is running %s with args: %s\n", function, args)

	// Handle different functions
	if function == "addNewTrade" { // add new trade and trace info
		return t.addNewTrade(stub, args)
	} else if function == "queryTrade" { //find trade based on an ad hoc rich query
		return t.queryTrade(stub, args)
	} else if function == "getTradeHistory" { //get history of values for a trade
		return t.getTradeHistory(stub, args)
	}

	fmt.Println("Invoke did not find func: " + function) //error
	return shim.Error("Received unknown function invocation")
}


// Add new trade and trace info, where TransactionId is fake
func (t *SupplyChaincode) addNewTrade(stub shim.ChaincodeStubInterface, args []string) pb.Response  {
    
    fmt.Println("########### supplychain_chaincode addNewTrade ###########")

	var TransactionId, Sku, TradeDate, TraceInfo, Counter string	// Fileds of a trade
	var TransactionIdVal, SkuVal, TradeDateVal, TraceInfoVal string	// Information values of a trade 
	var CounterVal int // Used for testing TPS
	var err error

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 8")
	}

	// Initialize the chaincode
	TransactionId = "TransactionId"
	TransactionIdVal = getUUID()
	TradeDate = "TradeDate"
	TradeDateVal = time.Unix(time.Now().Unix(), 0).String()
	Sku = args[0]
	SkuVal = args[1]	
	TraceInfo = args[2]
	TraceInfoVal = args[3]	
	Counter = "Counter"
	CounterVal = 0
	
	// Write the state to the ledger
	err = stub.PutState(TransactionId, []byte(TransactionIdVal))
	if err != nil {
		return shim.Error(err.Error())
	}
	
	err = stub.PutState(Sku, []byte(SkuVal))
	if err != nil {
		return shim.Error(err.Error())
	}
	
	err = stub.PutState(TradeDate, []byte(TradeDateVal))
	if err != nil {
		return shim.Error(err.Error())
	}
	
	err = stub.PutState(TraceInfo, []byte(TraceInfoVal))
	if err != nil {
		return shim.Error(err.Error())
	}
	
	CounterValbytes, err := stub.GetState(Counter)
	fmt.Printf("CounterVal:%d\n", CounterValbytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	CounterVal, _ = strconv.Atoi(string(CounterValbytes))
	CounterVal = CounterVal + 1
	err = stub.PutState(Counter, []byte(strconv.Itoa(CounterVal)))
	if err != nil {
		return shim.Error(err.Error())
	}
		
    fmt.Println("######### Successfully add New Trade #########")

	return shim.Success(nil)
}


// Query all fields of current state
func (t *SupplyChaincode) queryTrade(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var TransactionId, Sku, TradeDate, TraceInfo, Counter string	// Fileds of a trade
	var err error
	
	fmt.Println("---inside queryTrade---")
	fmt.Printf("queryTrade received %d args\n ", len(args))
	
	TransactionId = args[0]
	Sku = args[1]
	TradeDate = args[2]
	TraceInfo = args[3]
	Counter = "Counter"

	TransactionIdVal, err := stub.GetState(TransactionId)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	SkuVal, err := stub.GetState(Sku)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	TradeDateVal, err := stub.GetState(TradeDate)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	TraceInfoVal, err := stub.GetState(TraceInfo)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	CounterValbytes, err := stub.GetState(Counter)
	fmt.Printf("CounterVal:%d\n", CounterValbytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	
/*
	fmt.Printf("1.Query results: %x\n", TransactionIdVal)
	fmt.Printf("2.Query results: %x\n", SkuVal)
	fmt.Printf("3.Query results: %x\n", TradeDateVal)
	fmt.Printf("4.Query results: %x\n", TraceInfoVal)

	fmt.Printf("1.Query results: %x\n", string(TransactionIdVal))
	fmt.Printf("2.Query results: %x\n", string(SkuVal))
	fmt.Printf("3.Query results: %x\n", string(TradeDateVal))
	fmt.Printf("4.Query results: %x\n", string(TraceInfoVal))
*/
	QueryResults := []byte(string(TransactionIdVal) + "," + 
							string(SkuVal) + "," + 
							string(TradeDateVal) + "," + 
							string(TraceInfoVal) + "," + 
							string(string(CounterValbytes)))
	return shim.Success(QueryResults)
}


// Query all fields of historic state
func (t *SupplyChaincode) getTradeHistory(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	marbleName := args[0]

	fmt.Printf("- start getHistoryForMarble: %s\n", marbleName)

/*
// TODO: not implemented in current stable version. Waiting for v1.0 beta release.
	resultsIterator, err := stub.GetHistoryForKey(marbleName)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing historic values for the marble
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		txID, historicValue, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(txID)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		// historicValue is a JSON marble, so we write as-is
		buffer.WriteString(string(historicValue))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- getHistoryForMarble returning:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
*/

	queryString := args[0]
	queryResults, err := stub.GetState(queryString)
	if err != nil {
		return shim.Error(err.Error())
	}	
	return shim.Success(queryResults)	
}


// Generat fake TransactionId
func getUUID() (string) {
	f, _ := os.OpenFile("/dev/urandom", os.O_RDONLY, 0) 
    b := make([]byte, 16) 
    f.Read(b) 
    f.Close() 
    uuid := fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:]) 
	return uuid
}