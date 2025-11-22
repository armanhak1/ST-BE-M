import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

interface StatementData {
  statement: {
    transactions: Array<{
      date: string;
      description: string;
      type: "deposit" | "withdrawal";
      amount: number;
      balance_after?: number;
    }>;
    totals: {
      deposits: number;
      withdrawals: number;
      ending_balance: number;
    };
    period: {
      month: string;
      year: number;
    };
    starting_balance: number;
  };
  user_info: {
    full_name: string;
    address: string;
  };
}

export async function generatePDF(data: StatementData): Promise<Buffer> {
  // Read HTML and CSS templates
  // Handle both development (src folder) and production (dist folder) paths
  const possibleTemplateDirs = [
    path.join(__dirname, "templates"), // dist/templates (production)
    path.join(__dirname, "..", "src", "templates"), // src/templates (if running from dist)
    path.join(process.cwd(), "src", "templates"), // src/templates (absolute)
  ];

  let htmlPath = "";
  let cssPath = "";

  for (const templatesDir of possibleTemplateDirs) {
    const testHtmlPath = path.join(templatesDir, "statement.html");
    const testCssPath = path.join(templatesDir, "statement.css");
    if (fs.existsSync(testHtmlPath) && fs.existsSync(testCssPath)) {
      htmlPath = testHtmlPath;
      cssPath = testCssPath;
      break;
    }
  }

  if (!htmlPath || !cssPath) {
    throw new Error("Could not find HTML/CSS templates. Please ensure templates directory exists.");
  }

  let html = fs.readFileSync(htmlPath, "utf-8");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Extract data
  const statement = data.statement;
  const transactions = statement.transactions || [];
  const totals = statement.totals || {};
  const period = statement.period || {};
  const startingBalance = statement.starting_balance || 0;
  const userInfo = data.user_info || {};
  const fullName = userInfo.full_name || "";
  const address = userInfo.address || "";

  // Format dates
  const firstDate = transactions.length > 0 ? transactions[0].date : "9/9";
  const lastDate =
    transactions.length > 0
      ? transactions[transactions.length - 1].date
      : "10/7";

  const monthNames: { [key: string]: string } = {
    January: "January",
    February: "February",
    March: "March",
    April: "April",
    May: "May",
    June: "June",
    July: "July",
    August: "August",
    September: "September",
    October: "October",
    November: "November",
    December: "December",
  };

  const day = lastDate ? lastDate.split("/")[1] : "7";
  const statementDate = `${monthNames[period.month] || "October"} ${day}, ${period.year || 2025}`;

  // Helper to format currency
  const fmt = (n: number | undefined): string => {
    if (typeof n === "number") {
      return n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return "0.00";
  };

  // Determine which transactions should show ending balance
  const shouldShowBalance = (transaction: any, index: number): boolean => {
    if (index === transactions.length - 1) return true;
    if (transaction.type === "deposit") return true;
    if (transaction.type === "withdrawal" && transaction.amount >= 400)
      return true;
    return false;
  };

  // Generate transactions HTML
  let transactionsHTML = "";
  transactions.forEach((transaction, index) => {
    const isDeposit = transaction.type === "deposit";
    const isWithdrawal = transaction.type === "withdrawal";
    const showBalance = shouldShowBalance(transaction, index);

    transactionsHTML += "<tr>";
    transactionsHTML += `<td>${transaction.date || ""}</td>`;
    transactionsHTML += `<td></td>`; // Check number
    transactionsHTML += `<td>${transaction.description || ""}</td>`;
    transactionsHTML += `<td class="amount">${isDeposit ? `$${fmt(transaction.amount)}` : ""}</td>`;
    transactionsHTML += `<td class="amount">${isWithdrawal ? `$${fmt(transaction.amount)}` : ""}</td>`;
    transactionsHTML += `<td class="amount">${showBalance && transaction.balance_after ? `$${fmt(transaction.balance_after)}` : ""}</td>`;
    transactionsHTML += "</tr>";
  });

  // Replace placeholders in HTML
  html = html.replace(/\{\{statementDate\}\}/g, statementDate);
  html = html.replace(/\{\{fullName\}\}/g, fullName);
  html = html.replace(/\{\{address\}\}/g, address.replace(/\n/g, "<br>"));
  html = html.replace(/\{\{firstDate\}\}/g, firstDate);
  html = html.replace(/\{\{lastDate\}\}/g, lastDate);
  html = html.replace(/\{\{startingBalance\}\}/g, fmt(startingBalance));
  html = html.replace(/\{\{totalDeposits\}\}/g, fmt(totals.deposits));
  html = html.replace(/\{\{totalWithdrawals\}\}/g, fmt(totals.withdrawals));
  html = html.replace(/\{\{endingBalance\}\}/g, fmt(totals.ending_balance));
  html = html.replace(/\{\{transactions\}\}/g, transactionsHTML);

  // Inject CSS into HTML
  html = html.replace(
    '<link rel="stylesheet" href="statement.css">',
    `<style>${css}</style>`
  );

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    
    // Set content with HTML
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

