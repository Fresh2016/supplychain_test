# supplychain_test

## [How to use]

1. deploy.js, invoke.js, query.js, config.json放到node客户端所在节点的[your gopath]/fabric/examples/sfhackfest下面；
2. supplychain_chaincode.go放到node客户端所在节点的[your gopath]/fabric/examples/sfhackfest/src/github.com/supplychain下面；
3. 修改config.json中的"goPath":"/eclipse-workspace/fabric/examples/sfhackfest"为"goPath":"[your gopath]/fabric/examples/sfhackfest"；
4. 证书admin放到node客户端所在节点的/tmp/fabric-client-kvs;
5. 证书c663600c9ad0a7e50b59dedbb39ec77f0a72568c27b1cbffcc8114fde72795db-priv和c663600c9ad0a7e50b59dedbb39ec77f0a72568c27b1cbffcc8114fde72795db-pub放到node客户端所在节点的/root/.hfc-key-store；
6. 在[your gopath]/fabric/examples/sfhackfest运行：node deploy.js