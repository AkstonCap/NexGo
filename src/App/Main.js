import { useState } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  HorizontalTab,
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
  switchTab,
} from 'actions/actionCreators';

import Drive from './drive';
import FindRide from './findRide';

const DemoTextField = styled(TextField)({
  maxWidth: 400,
});

export default function Main() {
  const coreInfo = useSelector((state) => state.nexus.coreInfo);
  const userStatus = useSelector((state) => state.nexus.userStatus);
  const inputValue = useSelector((state) => state.ui.inputValue);
  const activeTab = useSelector((state) => state.ui.activeTab);
  const dispatch = useDispatch();

  const handleChange = (e) => {
    dispatch(updateInput(e.target.value));
  };

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <Panel title="NexGo" icon={{ url: 'react.svg', id: 'icon' }}>
      <HorizontalTab.TabBar>
        <HorizontalTab
          active={activeTab === 'FindRide'}
          onClick={() => handleSwitchTab('FindRide')}
        >
          Find Ride
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'Drive'}
          onClick={() => handleSwitchTab('Drive')}
        >
          Drive
        </HorizontalTab>
      </HorizontalTab.TabBar>
      
      <div>{activeTab === 'FindRide' && <FindRide />}</div>
      <div>{activeTab === 'Drive' && <Drive />}</div>
    </Panel>
  );
}
