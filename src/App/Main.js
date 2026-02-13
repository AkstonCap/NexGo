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

// Fallback: resolve location via IP geolocation when browser GPS is unavailable
// (e.g. inside Electron webviews like Nexus Interface)
async function fetchIPLocation() {
  const response = await fetch('https://ipapi.co/json/');
  if (!response.ok) throw new Error('IP geolocation request failed');
  const data = await response.json();
  if (data.latitude && data.longitude) {
    return { lat: data.latitude, lng: data.longitude };
  }
  throw new Error('No coordinates in IP geolocation response');
}

export default function Main() {
  const activeTab = useSelector((state) => state.ui.activeTab);
  const dispatch = useDispatch();

  useEffect(() => {
    // Try browser GPS first, fall back to IP geolocation
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
          // GPS failed — try IP-based geolocation as fallback
          fetchIPLocation()
            .then((pos) => dispatch(setUserPosition(pos)))
            .catch((ipErr) =>
              console.error('IP geolocation fallback failed:', ipErr)
            );
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // No geolocation API at all — go straight to IP fallback
      fetchIPLocation()
        .then((pos) => dispatch(setUserPosition(pos)))
        .catch((ipErr) =>
          console.error('IP geolocation fallback failed:', ipErr)
        );
    }

    // Initial taxi fetch
    dispatch(fetchTaxis());
  }, []);

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <Panel title="NexGo" icon={{ url: 'nexgo-logo.svg', id: 'icon' }}>
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
