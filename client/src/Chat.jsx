import React, { useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Logo from './Logo';
import Contact from './Contact';
import { UserContext } from './UserContext';
import { uniqBy } from 'lodash';

function Chat(props) {
    const [ws, setWs] = useState(null);
    const [OnlinePeople, setOnlinePeople] = useState({});
    const [OfflinePeople, setofflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const { userName, id, setId, setUserName } = useContext(UserContext)
    const [newMessageText, setNewMsgText] = useState('');
    const [messages, setMessages] = useState([]);
    const divUnderMessages = useRef();

    useEffect(() => {
        connectToWs();
    }, []);

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:3000/');
        setWs(ws);
        ws.addEventListener('message', handleMessage)
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log('Disconnected. Trying to reconnect');
                connectToWs();
            }, 1000);
        });
    }

    function ShowOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }
    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        console.log(ev, messageData);
        if ('Online' in messageData) {
            ShowOnlinePeople(messageData.Online);
        } else if ('text' in messageData) {
            if (messageData.sender === selectedUserId){
                setMessages(prev => ([...prev, { ...messageData }]));
            }
        }
    }


    function sendMessage(ev) {
        if (ev) ev.preventDefault();
        console.log('sending')
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText
        }));
        setNewMsgText('');
        setMessages(prev => ([...prev, {
            text: newMessageText,
            sender: id,
            recipient: selectedUserId,
            _id: Date.now()
        }]));
    }

    //logout
    function logout() {
        axios.post('/logout').then(() => {
            setWs(null);
            setId(null);
            setUserName(null);
        })
    }

    useEffect(() => {
        const div = divUnderMessages.current;
        if (div) div.scrollIntoView({ behaviour: 'smooth', bloc: 'end' });
    }, [messages])

    //fetches all the people who are offline.
    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data.filter(p => p._id !== id)
                .filter(p => !Object.keys(OnlinePeople).includes(p._id)); //this is necesary to remove all the online user, as offlinePeopleArr contains all user only except u.
            console.log(offlinePeopleArr);
            console.log(OnlinePeople);
            const OfflinePeople = {};
            offlinePeopleArr.forEach(p => {
                OfflinePeople[p._id] = p;
            });
            setofflinePeople(OfflinePeople);
        });
    }, [OnlinePeople])

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            })
        }
    }, [selectedUserId]);

    const onlinePeopleExclOurUser = { ...OnlinePeople }
    delete onlinePeopleExclOurUser[id];

    //deleteting msg duplicates twice

    const messagesWithoutDupes = uniqBy(messages, '_id');

    return (
        <div className='flex h-screen'>
            <div className='bg-white w-1/3 flex flex-col'>
                <div className='flex-grow'>
                    <Logo />
                    {Object.keys(onlinePeopleExclOurUser).map(userId => (
                        <Contact
                            key={userId}
                            id={userId}
                            online={true}
                            username={onlinePeopleExclOurUser[userId]}
                            onClick={() => {
                                setSelectedUserId(userId);
                                console.log({ userId })
                            }}
                            selected={userId === selectedUserId} />
                    ))}
                    {Object.keys(OfflinePeople).map(userId => (
                        <Contact
                            key={userId}
                            id={userId}
                            online={false}
                            username={OfflinePeople[userId].username}
                            onClick={() => setSelectedUserId(userId)}
                            selected={userId === selectedUserId} />
                    ))}
                </div>

                <div className='p-2 text-center flex items-center justify-center'>
                    <span className="mr-2 text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                        {userName}
                    </span>
                    <button onClick={logout}
                        className='text-sm bg-blue-200 py-1 px-2 text-gray-800 border rounded-sm'>logout</button>
                </div>
            </div>

            <div className=' flex flex-col bg-blue-200 w-2/3 p-2'>
                <div className='flex-grow'>
                    {!selectedUserId && (
                        <div className='flex h-full flex-grow items-center justify-center'>
                            <div className='text-gray-500'>&larr; Select a person from sidebar.</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className='relative h-full'>
                            <div className='overflow-y-scroll absolute top-0 left-0 right-0 bottom-2'>
                                {messagesWithoutDupes.map(message => (
                                    <div className={(message.sender === id ? 'text-right' : 'text-left')}>
                                        <div key={message._id} className={"text-left inline-block p-2 my-2 rounded-md text-sm " + (message.sender === id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className='flex gap-2' onSubmit={sendMessage}>
                        <input type="text"
                            value={newMessageText}
                            onChange={(ev) => setNewMsgText(ev.target.value)}
                            placeholder='Type your message here'
                            className="border flex-grow bg-white p-2 rounded-sm " />

                        <button type='submit'
                            className='bg-blue-500 p-3 text-white rounded-sm'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Chat;