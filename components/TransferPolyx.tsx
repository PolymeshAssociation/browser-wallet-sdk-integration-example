import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { PolymeshError, PolymeshTransactionBase } from '@polymeshassociation/polymesh-sdk/internal';
import { GenericPolymeshTransaction, TransactionStatus, UnsubCallback } from '@polymeshassociation/polymesh-sdk/types';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast, Id } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUpdateNotification } from '../hooks/useUpdateNotification';

interface TransferProps {
  accounts: string[];
  sdk: Polymesh;
  network: string;
}

export default function TransferPolyx({ accounts, sdk, network }: TransferProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]);
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [availableBalance, setAvailableBalance] = useState<string>();
  const [inputValue, setInputValue] = useState('');
  const [memo, setMemo] = useState<string>('');
  const [transferTx, setTransferTx] = useState<GenericPolymeshTransaction<void, void>>();
  const [transactionInProcess, setTransactionInProcess] = useState<boolean>(false);
  const [transactionDetails, setTransactionDetails] = useState<PolymeshTransactionBase>();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>();
  const [transferToastId, setTransferToastId] = useState<Id>();

  // Define reference for tracking component mounted state.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // If account is changed from the wallet set it as selected.
  useEffect(() => {
    if (mountedRef.current) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  useUpdateNotification(network, transferToastId, transactionStatus, transactionDetails);

  // If the sender is changed on the page set it as the selected account and signer.
  // Overrides wallet selected account.
  const handleAccountChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const setAccount = async () => {
      await sdk.setSigningAccount(event.target.value);
    };
    setSelectedAccount(event.target.value);
    setAccount();
  };

  const handleRecipientChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Only allow Alphanumeric string up to 48 characters
    if (event.target.value.match(/^[a-zA-Z0-9]{0,48}$/g)) {
      setDestinationAccount(event.target.value);
    }
  };

  const handleChangeAmount = (event: ChangeEvent<HTMLInputElement>) => {
    // Only update if the input is a number up to 6 decimal places
    if (event.target.value.match(/^\d*\.?\d{0,6}$/g)) {
      setInputValue(event.target.value);
    }
  };

  const handleChangeMemo = (event: ChangeEvent<HTMLInputElement>) => {
    setMemo(event.target.value);
  };

  const showToastError = (error: PolymeshError) => {
    toast.error(error.message, { autoClose: false, theme: 'light' });
  };

  // Subscribe to the selected account's balance.
  useEffect(() => {
    if (!sdk || !selectedAccount) return;
    let unsubBalance: UnsubCallback;
    const checkAvailableBalance = async () => {
      unsubBalance = await sdk.accountManagement.getAccountBalance({ account: selectedAccount }, (balance) => {
        if (mountedRef.current) setAvailableBalance(balance.free.toString());
      });
    };
    checkAvailableBalance();
    return () => {
      unsubBalance && unsubBalance();
    };
  }, [sdk, selectedAccount]);

  const handleSubmit = async () => {
    if (transactionInProcess) {
      toast.warning('A transfer is already in process', { autoClose: 5000, theme: 'light' });
      return;
    }
    try {
      const transferPolyxTx = await sdk.network.transferPolyx({
        amount: new BigNumber(inputValue),
        to: destinationAccount,
        memo: memo,
      });
      if (mountedRef.current) setTransferTx(transferPolyxTx);
    } catch (error) {
      if (error instanceof PolymeshError) {
        showToastError(error);
      } else {
        throw error;
      }
    }
  };

  useEffect(() => {
    if (!transferTx) return;
    if (mountedRef.current) setTransactionInProcess(true);

    const unsubTQ = transferTx.onStatusChange((transaction) => {
      if (transaction.status === 'Unapproved') {
        const id = toast.loading('Please sign transaction in wallet.', { autoClose: false, theme: 'light' });
        if (mountedRef.current) setTransferToastId(id);
      }
      if (mountedRef.current) {
        setTransactionDetails(transaction);
        setTransactionStatus(transaction.status);
      }
    });

    const handleTransfer = async () => {
      try {
        await transferTx.run();
      } catch (error) {
        if (error instanceof PolymeshError) {
          showToastError(error);
        } else {
          throw error;
        }
      } finally {
        if (mountedRef.current) {
          setTransactionInProcess(false);
          setTransferTx(undefined);
        }
      }
    };

    handleTransfer();
    return () => {
      unsubTQ && unsubTQ();
    };
  }, [transferTx]);

  return (
    <>
      <div className='Card'>
        <h1> Send POLYX</h1>
        <label htmlFor='from'>Select sending address: </label>
        <select style={{ appearance: 'none', width: '430px' }} value={selectedAccount} name='from' id='from' required onChange={handleAccountChange}>
          <option value='' disabled hidden>
            Select an Address
          </option>
          {accounts.map((acc, index) => (
            <option key={index} value={acc}>
              {acc}
            </option>
          ))}
        </select>
        <br />
        <label htmlFor='to'>Enter destination address: </label>
        <input
          placeholder='Enter Address'
          value={destinationAccount}
          type='text'
          name='to'
          id='to'
          list='accounts'
          maxLength={48}
          style={{ width: '430px', appearance: 'none' }}
          onChange={handleRecipientChange}
        />
        <datalist id='accounts'>
          {accounts.map((acc, index) => (
            <option key={index} value={acc} />
          ))}
        </datalist>
        <br />
        <label htmlFor='polyxAmount'>Enter the amount to send: </label>
        <input
          type='text'
          placeholder='Transfer amount'
          name='polyxAmount'
          id='polyxAmount'
          value={inputValue}
          size={12}
          onChange={handleChangeAmount}
        />{' '}
        {'('}
        {availableBalance ? availableBalance : '0'} {'available)'}
        <br />
        <label htmlFor='memo'>Enter a memo: </label>
        <input
          type='text'
          placeholder='Optional (max. 32 characters)'
          name='memo'
          id='memo'
          value={memo}
          maxLength={32}
          size={40}
          onChange={handleChangeMemo}
        />
        <br />
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
          <input type='submit' value='Submit Transfer' onClick={handleSubmit} />
        </div>
      </div>
    </>
  );
}
