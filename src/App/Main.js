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
} from 'actions/actionCreators';

import drive from './drive';
import findRide from './findRide';

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
  const switchTab = (tab) => {
    dispatch({
      type: TYPE.SWITCH_TAB,
      payload: tab,
    });
  };

  return (
    <Panel title="NexGo" icon={{ url: 'react.svg', id: 'icon' }}>
      <HorizontalTab.TabBar>
        <HorizontalTab
          active={activeTab === 'FindRide'}
          onClick={() => {
            switchTab('FindRide');
          }}
        >
          Find Ride
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'Drive'}
          onClick={() => {
            switchTab('Drive');
          }}
        >
          Drive
        </HorizontalTab>
      </HorizontalTab.TabBar>
      
      <div>{activeTab === 'FindRide' && <findRide />}</div>
      <div>{activeTab === 'Drive' && <drive />}</div>
    </Panel>
  );
}
