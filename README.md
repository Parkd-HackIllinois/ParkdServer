# ParkdServer
This the REST backend for all the other Parkd apps and services. The following are the endpoints.
It is also live (well, not YET) at http://parkd.abrarsyed.me
Every single endpoint is in the following pattern: ```http://example.com/api/VERSION/resourceName```. As of the latest version, the endpoint resource string is ```/api/0.1/resourceName```

### register
*method:* POST
*request:* ```{ "email": "someEmail@email.com", "pass":"somePass" }``` 
*replies:*
 - Success: Code 201 ```{ "id": ### } ```
 - Existing user: Code 409

### login
*method:* POST
*request:* ```{ "email": "someEmail@email.com", "pass":"somePass" }``` 
*replies:*
 - Success: Code 200 ```{ "id": ### } ```
 - No such user: Code 400 ```{ "error": "Email not found"}```
 - Wrong pass: Code 400 ```{ "error": "Wrong password"}```

