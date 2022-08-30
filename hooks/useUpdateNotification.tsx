import { toast, Id } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { TransactionStatus } from '@polymeshassociation/polymesh-sdk/types';
import { PolymeshTransactionBase } from '@polymeshassociation/polymesh-sdk/internal';
import { useEffect, useMemo } from 'react';

export const useUpdateNotification = (
  network: string,
  toastId?: Id,
  transactionStatus?: TransactionStatus,
  transactionDetails?: PolymeshTransactionBase
) => {
  const explorerURL: string | undefined = useMemo(() => {
    switch (network) {
      case 'staging':
        return;
      case 'testnet':
        return 'https://polymesh-testnet.subscan.io/extrinsic/';
      case 'mainnet':
        return 'https://polymesh.subscan.io/extrinsic/';
    }
    return;
  }, [network]);

  useEffect(() => {
    console.log(transactionStatus);

    if (!transactionStatus || !transactionDetails || !toastId) return;

    switch (transactionStatus) {
      case 'Running':
        toast.update(toastId, {
          render: (
            <>
              Transaction submitted{' '}
              {explorerURL && (
                <a href={explorerURL + transactionDetails?.txHash} target='_blank' rel='noopener noreferrer'>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
              )}
            </>
          ),
          type: 'info',
          isLoading: true,
          theme: 'light',
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
        });
        break;

      case 'Rejected':
        toast.update(toastId, {
          render: 'The transaction was rejected',
          type: 'warning',
          isLoading: false,
          theme: 'light',
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
        });
        break;

      case 'Succeeded':
        toast.update(toastId, {
          render: (
            <>
              Transaction successful{' '}
              {explorerURL && (
                <a href={explorerURL + transactionDetails?.txHash} target='_blank' rel='noopener noreferrer'>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
              )}
            </>
          ),
          type: 'success',
          isLoading: false,
          theme: 'light',
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
        });
        break;

      case 'Failed':
        toast.update(toastId, {
          render: (
            <>
              Transaction Failed{' '}
              {explorerURL && (
                <a href={explorerURL + transactionDetails?.txHash} target='_blank' rel='noopener noreferrer'>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
              )}
            </>
          ),
          type: 'error',
          isLoading: false,
          theme: 'light',
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
        });
        break;

      case 'Aborted':
        toast.update(toastId, {
          render: "Transaction Aborted, the transaction couldn't be broadcast",
          type: 'error',
          isLoading: false,
          theme: 'light',
          autoClose: false,
          closeOnClick: true,
          closeButton: true,
        });
        break;
    }

    return () => {};
  }, [explorerURL, toastId, transactionDetails, transactionStatus]);

  return;
};
