interface MockDataOptions {
  month?: string;
  year?: number;
  starting_balance?: number;
  withdrawal_target?: number;
  ending_balance_target?: number;
  full_name?: string;
  address?: string;
  card_last4?: string;
  mobile_deposit_business?: string;
  mobile_deposit_amount?: number;
}

export function generateMockData(options: MockDataOptions = {}) {
  const month = options.month || "October";
  const year = options.year || 2025;
  const startingBalance = options.starting_balance || 2000.00;
  const withdrawalTarget = options.withdrawal_target || 5000.00;
  const endingBalanceTarget = options.ending_balance_target || 1000.00;
  const fullName = options.full_name || "JOHN DOE";
  const address = options.address || "10934 KEY WEST AVE\nPORTER RANCH CA 91326-2623";
  const cardLast4 = options.card_last4 || "8832";
  const mobileDepositBusiness = options.mobile_deposit_business;
  const mobileDepositAmount = options.mobile_deposit_amount;

  // Calculate days in month
  const daysInMonth = new Date(year, getMonthNumber(month), 0).getDate();
  
  // Transaction templates
  const cafes = [
    "Starbucks", "Peet's Coffee", "Blue Bottle Coffee", "Coffee Bean", 
    "Dunkin'", "The Coffee Shop", "Cafe Luxxe", "Intelligentsia"
  ];
  
  const restaurants = [
    "In-N-Out Burger", "McDonald's", "Taco Bell", "Chipotle", 
    "Panda Express", "Subway", "Pizza Hut", "Domino's Pizza",
    "Olive Garden", "Cheesecake Factory", "Red Lobster"
  ];
  
  const onlineMarketplaces = [
    "Amazon.com", "Etsy", "eBay", "Walmart.com", "Target.com",
    "Best Buy", "Home Depot", "Lowe's", "Costco.com"
  ];
  
  const recurringPayments = [
    "Netflix", "Spotify", "Apple.Com/Bill", "Disney+", 
    "Hulu", "YouTube Premium", "Adobe", "Microsoft 365"
  ];
  
  const zelleNames = [
    "Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim",
    "Jessica Martinez", "Robert Taylor", "Amanda White", "James Brown"
  ];
  
  const atmLocations = [
    { street: "123 Main St", city: "Los Angeles" },
    { street: "456 Sunset Blvd", city: "Beverly Hills" },
    { street: "789 Wilshire Blvd", city: "Santa Monica" },
    { street: "321 Hollywood Blvd", city: "Hollywood" }
  ];

  const transactions: Array<{
    date: string;
    description: string;
    type: "deposit" | "withdrawal";
    amount: number;
    balance_after: number;
  }> = [];

  let currentBalance = startingBalance;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let transactionCount = 0;

  // Generate dates for the month (45 transactions spread across the month)
  const dates: string[] = [];
  const transactionsPerDay = Math.ceil(45 / daysInMonth);
  
  for (let day = 1; day <= daysInMonth && dates.length < 45; day++) {
    const numTransactions = Math.min(transactionsPerDay, 45 - dates.length);
    for (let i = 0; i < numTransactions && dates.length < 45; i++) {
      dates.push(`${getMonthNumber(month)}/${day}`);
    }
  }

  // Sort dates
  dates.sort((a, b) => {
    const [m1, d1] = a.split('/').map(Number);
    const [m2, d2] = b.split('/').map(Number);
    return d1 - d2;
  });

  // Add mobile deposit if specified (early in the month)
  if (mobileDepositBusiness && mobileDepositAmount) {
    const depositDate = dates[Math.floor(dates.length * 0.1)]; // Early in month
    currentBalance += mobileDepositAmount;
    totalDeposits += mobileDepositAmount;
    transactions.push({
      date: depositDate,
      description: `Mobile Deposit : Ref Number :${generateRefNumber()}`,
      type: "deposit",
      amount: mobileDepositAmount,
      balance_after: currentBalance,
    });
    transactionCount++;
  }

  // Generate remaining transactions
  const remainingTransactions = 45 - transactionCount;
  let withdrawalTotal = 0;
  const targetWithdrawal = withdrawalTarget;

  for (let i = transactionCount; i < 45; i++) {
    const date = dates[i] || dates[dates.length - 1];
    const isDeposit = Math.random() < 0.3; // 30% deposits, 70% withdrawals
    const needsMoreWithdrawals = withdrawalTotal < targetWithdrawal * 0.8;

    if (isDeposit && !needsMoreWithdrawals) {
      // Generate deposit
      const depositTypes = [
        () => `Zelle From ${getRandomItem(zelleNames)}`,
        () => `Direct Deposit PAYROLL`,
        () => `ACH Deposit TRANSFER`,
      ];
      
      const amount = parseFloat((Math.random() * 2000 + 500).toFixed(2));
      currentBalance += amount;
      totalDeposits += amount;
      
      transactions.push({
        date,
        description: getRandomItem(depositTypes)(),
        type: "deposit",
        amount,
        balance_after: currentBalance,
      });
    } else {
      // Generate withdrawal
      let description = "";
      let amount = 0;

      const withdrawalType = Math.random();
      if (withdrawalType < 0.25) {
        // Cafe purchase
        description = `${getRandomItem(cafes)} Card ${cardLast4}`;
        amount = parseFloat((Math.random() * 15 + 3).toFixed(2));
      } else if (withdrawalType < 0.45) {
        // Restaurant purchase
        description = `${getRandomItem(restaurants)} Card ${cardLast4}`;
        amount = parseFloat((Math.random() * 80 + 10).toFixed(2));
      } else if (withdrawalType < 0.65) {
        // Online marketplace
        description = `${getRandomItem(onlineMarketplaces)} Card ${cardLast4}`;
        amount = parseFloat((Math.random() * 300 + 20).toFixed(2));
      } else if (withdrawalType < 0.80) {
        // Recurring payment
        description = `${getRandomItem(recurringPayments)} Card ${cardLast4}`;
        amount = parseFloat((Math.random() * 50 + 5).toFixed(2));
      } else if (withdrawalType < 0.90) {
        // Zelle send
        description = `Zelle To ${getRandomItem(zelleNames)}`;
        amount = parseFloat((Math.random() * 500 + 50).toFixed(2));
      } else {
        // ATM withdrawal
        const atm = getRandomItem(atmLocations);
        const atmId = Math.floor(Math.random() * 900000 + 100000);
        description = `${atm.street} ${atm.city} CA ATM ID ${atmId} Card ${cardLast4}`;
        amount = parseFloat((Math.random() * 400 + 20).toFixed(2));
      }

      // Ensure we don't go negative (add some buffer)
      if (currentBalance - amount < 50) {
        // Make it a smaller withdrawal or skip
        amount = Math.min(amount, currentBalance - 50);
      }

      currentBalance -= amount;
      totalWithdrawals += amount;
      withdrawalTotal += amount;

      transactions.push({
        date,
        description,
        type: "withdrawal",
        amount,
        balance_after: currentBalance,
      });
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => {
    const [m1, d1] = a.date.split('/').map(Number);
    const [m2, d2] = b.date.split('/').map(Number);
    return d1 - d2;
  });

  // Recalculate balances after sorting
  let runningBalance = startingBalance;
  transactions.forEach((tx, index) => {
    if (tx.type === "deposit") {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    tx.balance_after = parseFloat(runningBalance.toFixed(2));
  });

  // Update final balance
  currentBalance = runningBalance;

  // Adjust to meet ending balance target if needed
  const difference = endingBalanceTarget - currentBalance;
  if (Math.abs(difference) > 10) {
    // Add a final adjustment transaction
    const lastDate = transactions[transactions.length - 1].date;
    if (difference > 0) {
      // Need more deposits
      currentBalance += difference;
      totalDeposits += difference;
      transactions.push({
        date: lastDate,
        description: `ACH Deposit ADJUSTMENT`,
        type: "deposit",
        amount: parseFloat(difference.toFixed(2)),
        balance_after: currentBalance,
      });
    } else {
      // Need more withdrawals (but don't go negative)
      const adjustment = Math.min(Math.abs(difference), currentBalance - 50);
      currentBalance -= adjustment;
      totalWithdrawals += adjustment;
      transactions.push({
        date: lastDate,
        description: `ATM Withdrawal ADJUSTMENT Card ${cardLast4}`,
        type: "withdrawal",
        amount: parseFloat(adjustment.toFixed(2)),
        balance_after: currentBalance,
      });
    }
    
    // Re-sort after adding adjustment
    transactions.sort((a, b) => {
      const [m1, d1] = a.date.split('/').map(Number);
      const [m2, d2] = b.date.split('/').map(Number);
      return d1 - d2;
    });
  }

  // Recalculate totals
  totalDeposits = transactions
    .filter(tx => tx.type === "deposit")
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  totalWithdrawals = transactions
    .filter(tx => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const endingBalance = startingBalance + totalDeposits - totalWithdrawals;

  return {
    statement: {
      period: {
        month,
        year,
      },
      starting_balance: startingBalance,
      labels: {
        withdrawals: "Withdrawals/Subtractions",
        deposits: "Deposits/Additions",
      },
      totals: {
        deposits: parseFloat(totalDeposits.toFixed(2)),
        withdrawals: parseFloat(totalWithdrawals.toFixed(2)),
        ending_balance: parseFloat(endingBalance.toFixed(2)),
        transaction_count: transactions.length,
      },
      transactions: transactions.slice(0, 45), // Ensure exactly 45
    },
    user_info: {
      full_name: fullName,
      address: address,
    },
  };
}

// Helper functions
function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    January: 1, February: 2, March: 3, April: 4,
    May: 5, June: 6, July: 7, August: 8,
    September: 9, October: 10, November: 11, December: 12,
  };
  return months[monthName] || 10;
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRefNumber(): string {
  return Math.floor(Math.random() * 900000000000 + 100000000000).toString();
}

