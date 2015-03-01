# ParkdServer 0.1
This the REST backend for all the other Parkd apps and services. The following are the endpoints.
It is also live at http://parkd.abrarsyed.me. All endpoints are in the pattern ```api/<version>/<resource>```, for example: ```http://parkd.abrarsyed.me/api/0.1/login```.

#### register
- **method:** POST
- **request:** ```{ "email": "someEmail@email.com", "pass":"somePass" }``` 
- **replies:**
 - **Success:** Code 201 ```{ "id": ### } ```
 - **Existing user:** Code 409

#### login
- **method:** POST
- **request:** ```{ "email": "someEmail@email.com", "pass":"somePass" }``` 
- **replies:**
 - **Success:** Code 200 ```{ "id": ### } ```
 - **No such user:** Code 400 ```{ "error": "Email not found"}```
 - **Wrong pass:** Code 400 ```{ "error": "Wrong password"}```
 
#### deleteUser
- **method:** POST
- **request:** ```{ "id": ####}``` 
- **replies:**
- **Success:** Code 200

#### getOpenSpots
- **method:** POST
- **request:** ```{ "longitude": 0.0, "latitude": 0.0 }``` 
- **replies:** Code 200 ```{ "spots": [ #, #], "suggested": [#, #] } ```
