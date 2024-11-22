import { useState } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  Switch,
  Tooltip,
  TextField,
  Button,
  FieldSet,
  confirm,
  apiCall,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';

import {
  showConnections,
  hideConnections,
  updateInput,
} from 'actions/actionCreators';

const DemoTextField = styled(TextField)({
  maxWidth: 400,
});

export default function Main() {
  const coreInfo = useSelector((state) => state.nexus.coreInfo);
  const userStatus = useSelector((state) => state.nexus.userStatus);
  const inputValue = useSelector((state) => state.ui.inputValue);
  const dispatch = useDispatch();
  const handleChange = (e) => {
    dispatch(updateInput(e.target.value));
  };


  return (
    <Panel title="NexGo" icon={{ url: 'react.svg', id: 'icon' }}>
      <div className="Overview">
        <h1>Welcome to NexGo</h1>
        <p>
          This is a taxi renting module built on top of the Nexus Wallet's
          module system.
        </p>
        <p>
          You can find available rides on the map and request a ride to 
          pick you up at your location, and pay with NXS.
        </p>
      </div>

      <div className="Map">
        <FieldSet legend="Module">
          <Map /> {/* Display the map */}
          {/* Add UI for requesting and accepting rides */}
        </FieldSet>
      </div>
    </Panel>
  );
}
