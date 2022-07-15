import React from 'react';
import Web3 from 'web3';
import { Drizzle } from '@drizzle/store';
import { DrizzleContext } from '@drizzle/react-plugin';
import Greeter from './artifacts/Greeter.json';
import Collectible from './artifacts/Collectible.json';
import Marketplace from './artifacts/Marketplace.json';
import Home from './layout/Home';

const HOST = process.env.HOST || '127.0.0.1';
const HOST_PORT = process.env.HOST_PORT || '7545';

// let drizzle know what contracts we want and how to access our test blockchain
const drizzleOptions = {
  contracts: [Greeter, Collectible, Marketplace],
  web3: {
    block: false,
    customProvider: new Web3(
      new Web3.providers.HttpProvider(`http://${HOST}:${HOST_PORT}`)
    ),
  },
};

// setup drizzle
const drizzle = new Drizzle(drizzleOptions);

function App() {
  return (
    <DrizzleContext.Provider drizzle={drizzle}>
      <DrizzleContext.Consumer>
        {(drizzleContext) => {
          const { drizzle, drizzleState, initialized } = drizzleContext;

          if (!initialized) {
            return 'Loading...';
          }

          return <Home drizzle={drizzle} drizzleState={drizzleState} />;
        }}
      </DrizzleContext.Consumer>
    </DrizzleContext.Provider>
  );
}

export default App;
