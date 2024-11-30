import { useState } from 'react';
import { FieldSet } from 'nexus-module';
import AsyncSelect from 'react-select/async';
import Map from 'components/Map';

const loadOptions = (inputValue, callback) => {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}`)
    .then((response) => response.json())
    .then((data) => {
      const options = data.map((item) => ({
        label: item.display_name,
        value: {
          lat: item.lat,
          lon: item.lon,
        },
      }));
      callback(options);
    })
    .catch((error) => {
      console.error('Error fetching address suggestions:', error);
      callback([]);
    });
};

export default function FindRide() {
  const [destination, setDestination] = useState(null);

  const handleDestinationChange = (selectedOption) => {
    setDestination(selectedOption);
  };
  
  return (
    <>
      <div className="Overview">
        <h1>Welcome to NexGo</h1>
        <p>
          This is a taxi renting module built on top of the Nexus Wallet's
          module system.
        </p>
        <p>
          You can find available rides on the map, request a ride to pick you up at your location,
          and pay with NXS.
        </p>
      </div>

      <div className="Map">
        <FieldSet legend="Find a Ride">
          <AsyncSelect
            cacheOptions
            loadOptions={loadOptions}
            onChange={handleDestinationChange}
            placeholder="Enter destination"
          />
        </FieldSet>
        <Map destination={destination} />
      </div>
    </>
  );
}