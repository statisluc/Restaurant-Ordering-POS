# Restaurant-Ordering-POS

REAL-TIME LOCAL NETWORK POS | NODE, REACT, SQLITE, SOCKET.IO


Overview:
I built a LAN-isolated real-time ordering system where customers can place orders from their phone. These orders will instantly appear on a kitchen dashboard thanks to WebSockets. The backend runs on a Chromebook, which uses SQLite, and enforces private network access control for security.
Customers scan a QR code and place an order from their phone browser. They enter their name, table number, and whatever notes/special requests they want to make on their order.
Orders instantly appear on a live kitchen dashboard, where the kitchen can change order status. The system blocks all non-LAN traffic. Will work even if internet goes down.


Goal:
Build a infrastructure-free POS system that runs on minimal hardware, requires no cloud hosting, enforces LAN-only access, and demonstrates real-time communication. Not just any CRUD screen, but a real-time system that will force me to better develop my understanding on network architecture and security. 


Frontend: React (Vite)
Backend: Node.js + Express
Database: SQLite (better-sqlite3)
Real-Time: Socket.IO
Security: LAN-only IP Filtering Middleware (restricted to 192.168, 10., 172.16-31, 127.0.0.1 (loopback)
QR Code Generation: Dynamic Base URL Endpoint


For LAN deployment:
Create .env file in project root
In server device terminal run: hostname -I (or find IP address of server device in settings if there is GUI)
In .env:
LAN_HOST = <your-private-ip> 
PORT = 3000


To run backend from root:

cd server

npm install

node server.js


To build frontend from root:

cd client

npm install

npm run build


