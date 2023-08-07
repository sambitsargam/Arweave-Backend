const axios = require('axios');
const CronJob = require('cron').CronJob;

const firebaseDatabaseURL = 'https://arhubtracker-default-rtdb.firebaseio.com';

const fetchDataFromFirebase = async () => {
  try {
    const response = await axios.get(`${firebaseDatabaseURL}/data.json`);
    const data = response.data;
    console.log('Fetched data from Firebase:', data);
    return data;
  } catch (error) {
    console.error('Error fetching data from Firebase:', error.message);
    return null;
  }
};
const  walletAddress = '4JOmaT9fFe2ojFJEls3Zow5UKO2CBOk7lOirbPTtX1o';

// now use the extracted walletaddress to fetch transactions
const fetchTransactions = async (walletAddress) => {
    try {
        const recipientsQuery = `{
            transactions(recipients: ["4JOmaT9fFe2ojFJEls3Zow5UKO2CBOk7lOirbPTtX1o"]) {
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
  
          const recipientsResponse = await axios.post("https://arweave.net/graphql", { query: recipientsQuery });
  
          // Fetch transactions for owners
          const ownersQuery = `{
            transactions(owners: ["4JOmaT9fFe2ojFJEls3Zow5UKO2CBOk7lOirbPTtX1o"]) {
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
  
          const ownersResponse = await axios.post("https://arweave.net/graphql", { query: ownersQuery });
  
          // Merge transactions data
          const recipientsTransactions = recipientsResponse.data.data.transactions.edges.map(edge => edge.node);
          const ownersTransactions = ownersResponse.data.data.transactions.edges.map(edge => edge.node);
  
          const mergedTransactions = [...recipientsTransactions, ...ownersTransactions];

          // now check timestamps of all transactions and filter out the ones that are done with in thats 60 seconds
            const filteredTransactions = mergedTransactions.filter(transaction => {
                const transactionTimestamp = transaction.block.timestamp;
                const currentTimestamp = Date.now() / 1000;
                const difference = currentTimestamp - transactionTimestamp;
                console.log(difference);
                return difference <= 6000;
            });

            console.log(filteredTransactions);

            // now check if the filtered transactions are more than 0
            if (filteredTransactions.length > 0) {
                // now send the filtered transactions to the nodemailer api to send email with all details of that transaction
                const response = await axios.post('https://arhubtracker.herokuapp.com/api/send-email', {
                    transactions: filteredTransactions
                });
                console.log(filteredTransactions)
                console.log('Email sent successfully');
            } else {
                console.log('No transactions found');
            }
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
    }
}

fetchTransactions();

// Schedule the job to run every two minutes
const cronJob = new CronJob('*/2 * * * *', fetchDataFromFirebase);

// Start the cron job
cronJob.start();
