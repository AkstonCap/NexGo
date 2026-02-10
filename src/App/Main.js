import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  HorizontalTab,
} from 'nexus-module';

import {
  switchTab,
  fetchTaxis,
  setUserPosition,
} from 'actions/actionCreators';

import Passenger from './Passenger';
import Driver from './Driver';

export default function Main() {
  const activeTab = useSelector((state) => state.ui.activeTab);
  const dispatch = useDispatch();

  useEffect(() => {
    // Get user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          dispatch(
            setUserPosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          );
        },
        (err) => {
          console.error('Geolocation error:', err);
        },
        { enableHighAccuracy: true }
      );
    }
    // Initial taxi fetch
    dispatch(fetchTaxis());
  }, []);

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <Panel title="NexGo" icon={{ url: 'react.svg', id: 'icon' }}>
      <HorizontalTab.TabBar>
        <HorizontalTab
          active={activeTab === 'Passenger'}
          onClick={() => handleSwitchTab('Passenger')}
        >
          Passenger
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'Driver'}
          onClick={() => handleSwitchTab('Driver')}
        >
          Driver
        </HorizontalTab>
      </HorizontalTab.TabBar>

      <div>{activeTab === 'Passenger' && <Passenger />}</div>
      <div>{activeTab === 'Driver' && <Driver />}</div>
    </Panel>
  );
}
