import { FieldSet } from 'nexus-module';
import Map from './Map';

export default function findRide() {
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
        <FieldSet legend="Module">
          <Map /> {/* Display the map */}
          {/* Add UI for requesting and accepting rides */}
        </FieldSet>
      </div>
    </>
  );
}