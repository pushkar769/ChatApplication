import axios from 'axios';
import React, { useContext, useState } from 'react';
import { UserContext } from './UserContext';

function RegisterAndLogin(props) {
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const {setUserName: setLoggedInUserName, setId} = useContext(UserContext);
    const [isLoginOrRegister, setLoginOrRegistered] = useState('register');
    

    async function handleSubmit(ev){
        // ev.preventDefault();
        // const url = isLoginOrRegister === 'register' ? 'register': 'login'
        // const url = `${import.meta.env.VITE_API_BASE_URL}/${endpoint}`;
        ev.preventDefault();
        const endpoint = isLoginOrRegister === 'register' ? 'register' : 'login';
        const url = isLoginOrRegister === 'register' ? 'register': 'login'
        const {data} = await axios.post(url, {username, password});
        setLoggedInUserName(username); 
        setId(data.id);
    }

    return (
        <div className='bg-blue-50 h-screen flex items-center'>
            <form method="post" className='w-64 mx-auto mb-12' onSubmit={handleSubmit}>
                <input type="text"
                    value={username}
                    onChange={ev => setUserName(ev.target.value)}
                    placeholder="username"
                    className='block w-full rounded-sm p-2 mb-2 border' />

                <input type="password"
                    value={password}
                    onChange={ev => setPassword(ev.target.value)}
                    placeholder="password"
                    className='block w-full rounded-sm p-2 mb-2 border' />

                <button className='bg-blue-500 text-white block w-full rounded-sm p-2'>
                    {isLoginOrRegister ==='register' ? 'Register': 'Login'}
                </button>
                <div className='text-center mt-2'>
                    {isLoginOrRegister === 'register' && (
                        <div>
                            Already a user ? &nbsp;
                            <button onClick={()=>setLoginOrRegistered('login')}>
                             Login Here
                            </button> 
                        </div>
                    )}
                    {isLoginOrRegister === 'login' && (
                        <div>
                            New to app ?? &nbsp; 
                        <button onClick={()=>setLoginOrRegistered('register')}>
                             Register Here
                        </button> 
                    </div>
                    )}
                </div>
            </form>
            
        </div>
    );
}

export default RegisterAndLogin;