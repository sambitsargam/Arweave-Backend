const axios = require('axios');
const CronJob = require('cron').CronJob;

const firebaseDatabaseURL = 'https://arhubtracker-default-rtdb.firebaseio.com';

const fetchDataFromFirebase = async () => {
  try {
    const response = await axios.get(`${firebaseDatabaseURL}/data.json`);
    const data = response.data;
    console.log('Fetched data from Firebase:', data);
    const walletAddresses = Object.values(data).map(entry => entry.walletAddress);

    // Assuming you want to fetch transactions for all wallet addresses, you can loop through them
    for (const walletAddress of walletAddresses) {
      // Call the fetchTransactions function with the extracted wallet address
      await fetchTransactions(walletAddress);
    }
    return data;
  } catch (error) {
    console.error('Error fetching data from Firebase:', error.message);
    return null;
  }
};

// now use the extracted walletaddress to fetch transactions
const fetchTransactions = async (walletAddress) => {
  try {
    const recipientsQuery = `{
      transactions(recipients: ["${walletAddress}"]) {
        edges {
          node {
            id
            recipient
            owner {
              address
            }
            fee {
              ar
            }
            quantity {
              winston
              ar
            }
            tags {
              name
              value
            }
            block {
              timestamp
            }
          }
        }
      }
    }`;

    const recipientsResponse = await axios.post("https://arweave.net/graphql", {
      query: recipientsQuery,
    });

    const recipientTransactions = recipientsResponse.data.data.transactions.edges.map(
      (edge) => edge.node
    );

    const ownersQuery = `{
      transactions(owners: ["${walletAddress}"]) {
        edges {
          node {
            id
            recipient
            owner {
              address
            }
            fee {
              ar
            }
            quantity {
              winston
              ar
            }
            tags {
              name
              value
            }
            block {
              timestamp
            }
          }
        }
      }
    }`;

    const ownersResponse = await axios.post("https://arweave.net/graphql", {
      query: ownersQuery,
    });

    const ownerTransactions = ownersResponse.data.data.transactions.edges.map(
      (edge) => edge.node
    );

    // Filter recipient transactions by timestamp
    const recipientfilteredTransactions = recipientTransactions.filter(
      (transaction) => {
        const transactionTimestamp = transaction.block.timestamp;
        const currentTimestamp = Date.now() / 1000;
        const difference = currentTimestamp - transactionTimestamp;
        return difference <= 120;
      }
    );

    // Filter owner transactions by timestamp
    const ownerfilteredTransactions = ownerTransactions.filter((transaction) => {
      const transactionTimestamp = transaction.block.timestamp;
      const currentTimestamp = Date.now() / 1000;
      const difference = currentTimestamp - transactionTimestamp;
      return difference <= 120;
    });

    // Rest of your code for sending email notifications

  } catch (error) {
    console.error('Error fetching transactions:', error.message);
  }
};

// Schedule the job to run every two minutes
const cronJob = new CronJob('*/2 * * * *', fetchDataFromFirebase);

// Start the cron job
cronJob.start();
