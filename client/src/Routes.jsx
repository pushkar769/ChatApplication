import React from 'react';
import RegisterAndLogin from './RegisterAndLogin';
import Chat from './Chat';
import { useContext } from 'react';
import { UserContext } from './UserContext';
function Routes(props) {

    const {userName, id} = useContext(UserContext);

    if(userName) return <Chat/>;

    return (
        <RegisterAndLogin/>
    );
}

export default Routes;