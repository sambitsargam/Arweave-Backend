const axios = require('axios');
const CronJob = require('cron').CronJob;

const firebaseDatabaseURL = 'https://arhubtracker-default-rtdb.firebaseio.com';

const fetchDataFromFirebase = async () => {
  try {
    const response = await axios.get(`${firebaseDatabaseURL}/data.json`);
    const data = response.data;
    console.log('Fetched data from Firebase:', data);
    fetchTransactions("4JOmaT9fFe2ojFJEls3Zow5UKO2CBOk7lOirbPTtX1o");
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
  
          const recipientsResponse = await axios.post("https://arweave.net/graphql", { query: recipientsQuery });
  
          // Fetch transactions for owners
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
  
          const ownersResponse = await axios.post("https://arweave.net/graphql", { query: ownersQuery });
  

          // now check timestamps of all transactions and filter out the ones that are done with in thats 60 seconds
            const recipientfilteredTransactions = recipientsResponse.filter(transaction => {
                const transactionTimestamp = transaction.block.timestamp;
                const currentTimestamp = Date.now() / 1000;
                const difference = currentTimestamp - transactionTimestamp;
                return difference <= 120;
            });

            const ownerfilteredTransactions = ownersResponse.filter(transaction => {
                const transactionTimestamp = transaction.block.timestamp;
                const currentTimestamp = Date.now() / 1000;
                const difference = currentTimestamp - transactionTimestamp;
                return difference <= 120;
            });

            // now check if the filtered transactions are more than 0
            if (recipientfilteredTransactions.length > 0) {
                // now send the filtered transactions to the nodemailer api to send email with all details of that transaction
                const response = await axios.post('https://arhubtracker.herokuapp.com/api/send-email', {
                    transactions: recipientfilteredTransactions
                });
                console.log("recipientfilteredTransactions are", recipientfilteredTransactions);
                console.log('Email sent successfully');
            } else {
                console.log('No Reciptant transactions found');
            }

            if (ownerfilteredTransactions.length > 0) {
                // now send the filtered transactions to the nodemailer api to send email with all details of that transaction
                const response = await axios.post('https://arhubtracker.herokuapp.com/api/send-email', {
                    transactions: ownerfilteredTransactions
                });
                console.log("ownerfilteredTransactions are", ownerfilteredTransactions);
                console.log('Email sent successfully');
            }
            else {
                console.log('No Owner transactions found');
            }
            
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
    }
}

// Schedule the job to run every two minutes
const cronJob = new CronJob('*/2 * * * *', fetchDataFromFirebase);

// Start the cron job
cronJob.start();
