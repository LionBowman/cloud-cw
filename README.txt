/*
 *  Leandro FB - NotFlix Proof Of Concept
 */

// Running The Application
--------------------------
Before you start the program on the VM, you will first need to add you VM IP to the following:

    -  the vmIP variable in the broadcast.js file :- var vmIP = '<yourVmIP>'
    -  the API call URLs in the mongodbTest.http file :- eg. POST http://<yourVmIP>:81
    -  the connectionString variable in the broadcast.js file :- var connectionString = 'amqp://user:bitnami@<youtVmIp>:5672'

Once done, you can use the following commands (can be copied and pasted as one):

    -  git clone https://github.com/LionBowman/cloud-cw/
    -  cd ./cloud-cw
    -  git pull
    -  sudo docker-compose up --build

NOTE: The program seems to take quite a long time to initialse properly so please bare with it!

// Testing
----------

Self Healing Feature - If you kill a node, a new one will be instantiated to bring the system back to its default 
configuration (30 sec wait before pruning a dead node from the array list and a 20 sec wait on node creation):

    -  sudo docker container ls 
    // Find the containerID of the one you want to remove
    -  sudo docker rm <containerID> -f

Scheduled Service Provision / Auto Scaling - 2 extra nodes are added during a defined 'Peak Time' (between 17:00 and 22:00):

    -  All you have to do is wait ... Or ... change the time variables. 