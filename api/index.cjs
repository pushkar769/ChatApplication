const express = require('express');
const { default: mongoose } = require('mongoose');
require('dotenv').config();
const User = require('./models/User.cjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs')
const ws = require('ws');
const Message = require('./models/Message.cjs')


mongoose.connect(process.env.MONGODB_URL);

const jwtSecret = process.env.JWT_SECRET;

const bcryptSalt = bcrypt.genSaltSync(10);
const app = express();

// Parse JSON bodies
app.use(express.json());

// To parse cookies

app.use(cookieParser());

// Allow requests from the FRONTEND_ORIGIN specified in the .env file
app.use(cors({
    credentials: true,
    origin: process.env.FRONTEND_ORIGIN
}));


async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
      const token = req.cookies?.token;
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          resolve(userData);
        });
      } else {
        reject('no token');
      }
    });
  
  }

app.get('/api/test', (req, res) => {
    res.json('test ok');
    
});



app.get('/api/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender:{$in:[userId,ourUserId]},
      recipient:{$in:[userId,ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
  });


app.get('/api/people', async (req,res) => {
    const users = await User.find({}, {'_id':1,username:1});
    console.log(users);
    res.json(users);
  });

app.get('/api/profile', (req, res) => {
    const token = req.cookies.token;
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData);
    })
})

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body
    const foundUser = await User.findOne({ username })

    //check user hash
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        //sending cookies if all ok
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token, { sameSite: 'None', secure: true }).status(201).json({
                    id: foundUser._id,

                });
            });
        }
    }
})

app.post('/api/logout', (req,res)=> {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
})

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    console.log(req.body);
    try {
        const hashPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({
            username: username,
            password: hashPassword
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { sameSite: 'None', secure: true }).status(201).json({
                id: createdUser._id,

            });
        });
    }
    catch (err) {
        if (err) throw err;
    }


});


const server = app.listen(3000);

//reads the, userId and userName from the cookies headers.

    const wss = new ws.WebSocketServer({ server })

    wss.on('connection', (connection, req) => {

        function notifyAboutOnlinePeople(){
            [...wss.clients].forEach(client => {
                client.send(JSON.stringify({
                Online: [...wss.clients].map(c => ({userId: c.userId, username:c.username}))
                }));
            });
        }

        connection.isAlive = true;

        connection.timmer=setInterval(() => {
            connection.ping();
            connection.deathTimer = setTimeout(() => {
                connection.isAlive = false;
                clearInterval(connection.timer);
                connection.terminate();
                notifyAboutOnlinePeople();
                console.log('dead');
            }, 1000);
        }, 3000);

        connection.on('pong', () => {
            clearTimeout(connection.deathTimer);
        })

        const cookies = req.headers.cookie;
        if (cookies) {
            const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));

            if (tokenCookieString) {
                const token = tokenCookieString.split('=')[1];
                if (token) {
                    jwt.verify(token, jwtSecret, {}, (err, userData) => {
                        if (err) throw err;
                        const { userId, username } = userData;
                        connection.userId = userId;
                        connection.username = username;
                    });
                }
            }
        }

        connection.on('message', async(message) => {
            const messageData = JSON.parse(message.toString());
            const {recipient, text} = messageData;
            console.log(messageData);


            if (recipient && text) {

                //storing messages to collection
                const messageDoc = await Message.create({
                    sender:connection.userId,
                    recipient,
                    text
                  });

                [...wss.clients].filter(client => client.userId === recipient).forEach(client => {
                    client.send(JSON.stringify({ 
                        text,
                        sender: connection.userId,
                        recipient,
                        _id: messageDoc._id })); // Send entire object with 'text' property
                });
            }
        });
        //showing online users
        notifyAboutOnlinePeople();
    });
