import type { NextPage } from 'next';
import { useEffect, useRef, useState } from 'react';
import type { BrowserExtensionSigningManager } from '@polymeshassociation/browser-extension-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { NetworkInfo } from '@polymeshassociation/browser-extension-signing-manager/types';
import TransferPolyx from '../components/TransferPolyx';
import Spinner from '../components/Spinner';
import { toast } from 'react-toastify';

const Home: NextPage = () => {
  const [signingManager, setSigningManager] = useState<BrowserExtensionSigningManager>();
  const [network, setNetwork] = useState<NetworkInfo>();
  const [sdk, setSdk] = useState<Polymesh>();
  const [chain, setChain] = useState<string>();
  const [accounts, setAccounts] = useState<string[]>();
  const [walletError, setWalletError] = useState<string>();

  // Define reference for tracking component mounted state.
  const mountedRef = useRef(false);
  // Effect for tracking mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Create the browser extension signing manager.
  useEffect(() => {
    const createSigningManager = async () => {
      const { BrowserExtensionSigningManager } = await import('@polymeshassociation/browser-extension-signing-manager');
      try {
        const browserSigningManager = await BrowserExtensionSigningManager.create({
          appName: 'polymesh-example-wallet-sdk-integration', //Name of dApp used when wallet prompts to authorize connection.
          extensionName: 'polywallet', // 'polywallet' is the default if omitted.
        });

        if (mountedRef.current) {
          setSigningManager(browserSigningManager);
        }
      } catch (error) {
        if (error instanceof Error) {
          setWalletError(error.message);
        } else {
          throw error;
        }
      }
    };
    createSigningManager();
    return () => {};
  }, []);

  // Set the Node URL and handle changes in in network.
  // Note: The network object requires the Polymesh "polywallet" browser extension.
  // For other extension types or connecting to an alternate node the address should be set manually.
  useEffect(() => {
    if (!signingManager) return;
    let effectMounted = true;

    const readNodeAddressFromWallet = async () => {
      // @ts-ignore
      const networkInfo = await signingManager.extension.network.get();
      if (effectMounted) {
        setNetwork(networkInfo);
      }
    };
    readNodeAddressFromWallet();

    const unsubNetworkChange = signingManager.onNetworkChange((network) => {
      if (effectMounted) setNetwork(network);
      toast.dismiss();
    });
    return () => {
      effectMounted = false;
      unsubNetworkChange && unsubNetworkChange();
    };
  }, [signingManager]);

  // Connect to the Polymesh SDK
  useEffect(() => {
    if (!network || !signingManager) return;
    let effectMounted = true;
    let polymeshSdk: Polymesh;

    console.log(`\nConnecting to Polymesh ${network.name} at ${network.wssUrl}.\n`);

    const connect = async () => {
      polymeshSdk = await Polymesh.connect({
        nodeUrl: network.wssUrl,
        signingManager,
      });
      const chainName = (await polymeshSdk._polkadotApi.rpc.system.chain()).toString();
      if (effectMounted) {
        setSdk(polymeshSdk);
        setChain(chainName);
      }
    };
    connect();

    return () => {
      effectMounted = false;
      polymeshSdk?.disconnect();
      // If unmount was triggered by network change and component is still mounted set to undefined
      if (mountedRef.current) {
        setSdk(undefined);
        setAccounts(undefined);
      }
    };
  }, [network, signingManager]);

  useEffect(() => {
    if (!signingManager || !sdk) return;
    let effectMounted = true;
    const readAccounts = async () => {
      const allAccounts = await signingManager.getAccounts();

      if (effectMounted) setAccounts(allAccounts);
    };

    readAccounts();

    const unsubAccounts = signingManager.onAccountChange((allAccounts) => {
      const setSelectedAccountToSigner = async () => {
        await sdk.setSigningAccount(allAccounts[0]);
      };

      if (effectMounted) {
        setAccounts(allAccounts);
        setSelectedAccountToSigner();
      }
    });

    return () => {
      unsubAccounts && unsubAccounts();
    };
  }, [signingManager, sdk]);

  return (
    <div className='App'>
      {network && accounts && sdk ? (
        <>
          Connected to {chain} @ {network.wssUrl}
          <br />
          Wallet selected account {accounts[0]}
          <br />
          <TransferPolyx accounts={accounts} sdk={sdk} network={network.name} />
        </>
      ) : (
        <>
          {walletError ? (
            walletError
          ) : (
            <>
              {signingManager ? ' ✓ Signing Manager Created' : '• Awaiting Signing Manager'}
              <br />
              {network ? ` ✓ Node URL: ${network.wssUrl}` : '• Awaiting Node Url'}
              <br />
              {network ? `• Connecting to ${network.name} @ ${network.wssUrl}` : '• Awaiting Network'}
              <br />
              <Spinner />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
