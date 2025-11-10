import PDFDocument from "pdfkit";
import { AutoResponse } from "./ai";
import * as path from "path";
import * as fs from "fs";

export async function generatePDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // US Letter size: 8.5" x 11" (612 x 792 points)
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);

    const statement = data.statement;
    const transactions = statement.transactions || [];
    const totals = statement.totals || {};
    const period = statement.period || {};
    const startingBalance = statement.starting_balance || 0;
    const labels = statement.labels || {
      deposits: "Deposits/Additions",
      withdrawals: "Withdrawals/Subtractions",
    };
    
    // Get user info (name and address) - required fields from bot
    const userInfo = data.user_info || {};
    const fullName = userInfo.full_name || "";
    const address = userInfo.address || "";

    // Helper function to format numbers
    const fmt = (n: number | undefined): string => {
      if (typeof n === "number") {
        return n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return "";
    };

    // Get first and last transaction dates
    const firstDate = transactions.length > 0 ? transactions[0].date : "9/9";
    const lastDate =
      transactions.length > 0 ? transactions[transactions.length - 1].date : "10/7";

    // Format header date
    const formatHeaderDate = (month: string, year: number): string => {
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
      return `${monthNames[month] || "October"} ${day}, ${year || 2025}`;
    };

    const headerDate = formatHeaderDate(period.month, period.year);

    // Determine which transactions should show ending balance
    const shouldShowBalance = (transaction: any, index: number): boolean => {
      if (index === transactions.length - 1) return true;
      if (transaction.type === "deposit") return true;
      if (transaction.type === "withdrawal" && transaction.amount >= 400)
        return true;
      return false;
    };

    // Constants - matching HTML layout
    const pageWidth = doc.page.width; // 612 points
    const pageHeight = doc.page.height; // 792 points
    // HTML page: 918px wide, PDF page: 612 points wide
    // Conversion: 612 / 918 = 0.667
    const pxToPt = 612 / 918;
    
    // Helper to draw Wells Fargo logo (using image)
    // Try multiple paths: src folder (dev) and dist folder (production)
    const logoFileName = "wells-fargo-vector-logo-11574282111r5zfolylck.png";
    const possiblePaths = [
      path.join(__dirname, logoFileName), // dist folder (production)
      path.join(__dirname, "..", "src", logoFileName), // src folder (if running from dist)
      path.join(process.cwd(), "src", logoFileName), // src folder (absolute)
    ];
    
    let logoImage: Buffer | null = null;
    
    for (const logoPath of possiblePaths) {
      try {
        if (fs.existsSync(logoPath)) {
          logoImage = fs.readFileSync(logoPath);
          break;
        }
      } catch (err) {
        // Continue to next path
      }
    }
    
    if (!logoImage) {
      console.warn("Could not load logo image, will use fallback");
    }
    
    const drawLogo = (x: number, y: number, size: number) => {
      if (logoImage) {
        try {
          doc.image(logoImage, x, y, { width: size, height: size });
        } catch (err) {
          // Fallback to drawn logo if image fails
          drawLogoFallback(x, y, size);
        }
      } else {
        drawLogoFallback(x, y, size);
      }
    };
    
    const drawLogoFallback = (x: number, y: number, size: number) => {
      // Red background square
      doc.rect(x, y, size, size)
        .fillColor("#b40000")
        .fill()
        .fillColor("#000000"); // Reset to black
      
      // Yellow text "WELLS FARGO"
      doc.fillColor("#FFD700") // Gold/yellow color
        .font("Helvetica-Bold")
        .fontSize(size * 0.2)
        .text("WELLS", x, y + size * 0.25, {
          width: size,
          align: "center",
        })
        .text("FARGO", x, y + size * 0.5, {
          width: size,
          align: "center",
        })
        .fillColor("#000000"); // Reset to black
    };

    // ========== PAGE 1 ==========
    let pageNum = 1;
    
    // Header: Title (top:39px, left:54px, font-size:28px, bold)
    doc.fontSize(28 * pxToPt).font("Helvetica-Bold");
    doc.text("Wells Fargo Everyday Checking", 54 * pxToPt, 39 * pxToPt);
    
    // Date and Page (top:70px, left:54px and left:176px, font-size:12px)
    doc.fontSize(12 * pxToPt).font("Times-Roman");
    doc.text(headerDate, 54 * pxToPt, 70 * pxToPt);
    doc.text("Page 1 of 10", 176 * pxToPt, 70 * pxToPt);

    // Logo on the right (positioned around 561px+ from HTML, size ~92px)
    const logoSize = 92 * pxToPt;
    const logoX = pageWidth - (54 * pxToPt) - logoSize; // Right-aligned with 54px margin
    const logoY = 39 * pxToPt; // Align with title
    drawLogo(logoX, logoY, logoSize);

    // Content grid: Address on left, Questions box on right
    // Address (top:255px, left:54px, font-size:12px, line-height:16px)
    const addressX = 54 * pxToPt;
    const addressY = 255 * pxToPt;
    doc.fontSize(12 * pxToPt).font("Times-Roman");
    const addressText = `${fullName}\n${address}`;
    doc.text(addressText, addressX, addressY, {
      lineGap: 4,
    });

    // Right: Questions box (top:224px, left:561px)
    const qboxX = 561 * pxToPt;
    const qboxY = 224 * pxToPt;
    
    // Vertical rule (3px solid black)
    doc.strokeColor("#000000").lineWidth(3 * pxToPt);
    doc.moveTo(qboxX, qboxY).lineTo(qboxX, qboxY + 260 * pxToPt).stroke();
    doc.strokeColor("#000000");
    
    const paneX = qboxX + (8 * pxToPt) + (14 * pxToPt); // 8px rule + 14px padding
    
    // Questions content
    doc.fontSize(14 * pxToPt).font("Helvetica-Bold");
    doc.text("Questions?", paneX, qboxY);
    
    let qY = qboxY + 28 * pxToPt; // top:252px
    doc.fontSize(11 * pxToPt).font("Times-Italic").fillColor("#000000");
    doc.text("Available by phone 24 hours a day, 7 days a week:", paneX, qY, {
      width: pageWidth - paneX - (54 * pxToPt),
      lineGap: 2,
    });
    qY += 15 * pxToPt; // line-height:15px
    
    doc.fontSize(11 * pxToPt).font("Times-Roman");
    doc.text("We accept all relay calls, including 711", paneX, qY, {
      width: pageWidth - paneX - (54 * pxToPt),
      lineGap: 2,
    });
    
    qY += 20 * pxToPt; // top:285px
    doc.fontSize(14 * pxToPt).font("Helvetica-Bold");
    doc.text("1-800-TO-WELLS", paneX, qY);
    
    qY += 25 * pxToPt; // top:310px
    doc.fontSize(11 * pxToPt).font("Times-Roman");
    doc.text("En español: ", paneX, qY);
    doc.text("1-877-727-2932", paneX + 80 * pxToPt, qY);
    
    qY += 56 * pxToPt; // top:366px
    doc.fontSize(11 * pxToPt).font("Times-Roman");
    doc.text("Online: ", paneX, qY);
    doc.text("wellsfargo.com", paneX + 50 * pxToPt, qY);
    
    qY += 25 * pxToPt; // top:391px
    doc.text("Write: ", paneX, qY);
    doc.text("Wells Fargo Bank, N.A. (114)", paneX + 50 * pxToPt, qY);
    
    qY += 16 * pxToPt; // top:407px
    doc.text("P.O. Box 6995", paneX + 50 * pxToPt, qY);
    qY += 16 * pxToPt;
    doc.text("Portland, OR  97228-6995", paneX + 50 * pxToPt, qY);

    // "You and Wells Fargo" section (top:499px, left:54px, font-size:19px, bold)
    let sectionY = 499 * pxToPt;
    doc.fontSize(19 * pxToPt).font("Helvetica-Bold").fillColor("#000000");
    doc.text("You and Wells Fargo", 54 * pxToPt, sectionY);
    
    sectionY += 26 * pxToPt; // top:525px
    doc.fontSize(11 * pxToPt).font("Times-Roman").fillColor("#000000");
    doc.text(
      "Thank you for being a loyal Wells Fargo customer. We value your trust in our company and look forward to continuing to serve you with your financial needs.",
      54 * pxToPt,
      sectionY,
      { width: pageWidth - (108 * pxToPt), lineGap: 2 }
    );

    // "Other Wells Fargo Benefits" section (top:744px, left:47px)
    sectionY = 744 * pxToPt;
    doc.fontSize(11 * pxToPt).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Other Wells Fargo Benefits", 47 * pxToPt, sectionY);
    
    sectionY += 31 * pxToPt; // top:775px
    doc.fontSize(11 * pxToPt).font("Helvetica-Bold");
    doc.text("It's Cybersecurity Awareness Month.", 47 * pxToPt, sectionY);
    
    sectionY += 31 * pxToPt; // top:806px
    doc.fontSize(11 * pxToPt).font("Times-Roman");
    doc.text(
      "In today's digital world, scammers are using advanced tools like AI to make impersonation scams harder to detect. Caller ID can be spoofed, emails can be faked, voices can be cloned, and images can be altered.",
      47 * pxToPt,
      sectionY,
      { width: pageWidth - (94 * pxToPt), lineGap: 2 }
    );

    sectionY += 48 * pxToPt; // top:854px
    doc.fontSize(11 * pxToPt).font("Helvetica-Bold");
    doc.text("Imposters may contact you with messages that:", 47 * pxToPt, sectionY);
    
    sectionY += 20 * pxToPt;
    const bulletPoints = [
      "Are unexpected.",
      "Appear to be from a legitimate source but could be spoofed.",
      "Claim to be urgent, asking you to act right away, without thinking.",
      "Use language that manipulates your emotions.",
      "Request payment through unusually specific methods like gift cards, cryptocurrency or payment apps.",
    ];
    
    bulletPoints.forEach((point) => {
      doc.fontSize(11 * pxToPt).font("Times-Roman");
      doc.text(`- ${point}`, 47 * pxToPt, sectionY, {
        width: pageWidth - (94 * pxToPt),
        lineGap: 2,
      });
      sectionY += 20 * pxToPt;
    });

    sectionY += 8 * pxToPt; // top:963px
    doc.fontSize(12 * pxToPt).font("Times-Roman");
    doc.text(
      "If you have any doubts about a message, call the company or government agency directly to find out if there really is a problem.",
      47 * pxToPt,
      sectionY,
      { width: pageWidth - (94 * pxToPt), lineGap: 2 }
    );

    sectionY += 32 * pxToPt; // top:995px
    doc.fontSize(11 * pxToPt).font("Times-Roman");
    doc.text(
      "And if they're impersonating Wells Fargo, don't engage. Instead, call us right away or you can always check your account in the Wells Fargo Mobile® app* or in online banking.",
      47 * pxToPt,
      sectionY,
      { width: pageWidth - (94 * pxToPt), lineGap: 2 }
    );

    // ========== PAGE 2 ==========
    doc.addPage();
    pageNum = 2;
    let yPos = 0; // Initialize yPos for Page 2

    // Header: Date and Page (top:41px, left:54px and left:178px, font-size:10px)
    doc.fontSize(10 * pxToPt).font("Times-Roman");
    doc.text(headerDate, 54 * pxToPt, 41 * pxToPt);
    doc.text("Page 2 of 10", 178 * pxToPt, 41 * pxToPt);
    
    // Logo on right
    const logo2Size = 92 * pxToPt;
    const logo2X = pageWidth - (54 * pxToPt) - logo2Size;
    const logo2Y = 41 * pxToPt; // Align with header
    drawLogo(logo2X, logo2Y, logo2Size);

    // Thick horizontal rule (6px at top:151px)
    const ruleY = 151 * pxToPt;
    doc.fillColor("#111111").rect(54 * pxToPt, ruleY, pageWidth - (108 * pxToPt), 6 * pxToPt).fill();

    // Disclaimer text (top:151px, left:54px, font-size:10px)
    doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
    doc.text("Learn more at ", 54 * pxToPt, ruleY + 20 * pxToPt);
    doc.font("Helvetica-Bold");
    const learnMoreWidth = doc.widthOfString("Learn more at ");
    doc.text("www.wellsfargo.com/scams", 54 * pxToPt + learnMoreWidth, ruleY + 20 * pxToPt);
    
    doc.font("Times-Roman").fontSize(10 * pxToPt);
    doc.text(
      "*Availability may be affected by your mobile carrier's coverage area. Your mobile carrier's message and data rates may apply.",
      54 * pxToPt,
      ruleY + 51 * pxToPt,
      { width: pageWidth - (108 * pxToPt), lineGap: 2 }
    );

    // Two-column grid: Summary + Account info
    // Left: Statement period activity summary (top:211px, left:54px, font-size:12px, bold)
    const summaryX = 54 * pxToPt;
    const summaryY = 211 * pxToPt;
    doc.fontSize(12 * pxToPt).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Statement period activity summary", summaryX, summaryY);
    
    // Summary table with border-top (2px solid #222)
    const summaryTableTopY = summaryY + 23 * pxToPt; // top:234px
    doc.strokeColor("#222222").lineWidth(2);
    doc.moveTo(summaryX + 43 * pxToPt, summaryTableTopY).lineTo(summaryX + 388 * pxToPt, summaryTableTopY).stroke();
    doc.strokeColor("#000000");
    
    let sumY = summaryTableTopY + 12 * pxToPt; // Padding top
    
    doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
    
    // Beginning balance (top:234px)
    doc.text(`Beginning balance on ${firstDate}`, summaryX + 43 * pxToPt, sumY);
    const begBalText = `$${fmt(startingBalance)}`;
    const begBalWidth = doc.widthOfString(begBalText);
    doc.text(begBalText, summaryX + 388 * pxToPt - begBalWidth, sumY);
    
    sumY += 18 * pxToPt; // top:252px
    
    // Deposits (top:252px)
    doc.text("Deposits/Additions", summaryX + 43 * pxToPt, sumY);
    const depText = fmt(totals.deposits);
    const depWidth = doc.widthOfString(depText);
    doc.text(depText, summaryX + 388 * pxToPt - depWidth, sumY);
    
    sumY += 18 * pxToPt; // top:270px
    
    // Withdrawals (top:270px)
    doc.text("Withdrawals/Subtractions", summaryX + 43 * pxToPt, sumY);
    const wdrText = `- ${fmt(totals.withdrawals)}`;
    const wdrWidth = doc.widthOfString(wdrText);
    doc.text(wdrText, summaryX + 380 * pxToPt - wdrWidth, sumY);
    
    sumY += 21 * pxToPt; // top:291px
    
    // Ending balance (bold, top:291px)
    doc.font("Helvetica-Bold");
    doc.text(`Ending balance on ${lastDate}`, summaryX + 43 * pxToPt, sumY);
    const endBalText = `$${fmt(totals.ending_balance)}`;
    const endBalWidth = doc.widthOfString(endBalText);
    doc.text(endBalText, summaryX + 386 * pxToPt - endBalWidth, sumY);

    // Right: Account info (top:210px, left:534px)
    const accountX = 534 * pxToPt;
    const accountStartY = 210 * pxToPt;
    
    // Vertical rule (3px solid #111) - from HTML structure
    const vr2X = accountX;
    doc.strokeColor("#111111").lineWidth(3 * pxToPt);
    doc.moveTo(vr2X, accountStartY).lineTo(vr2X, accountStartY + 120 * pxToPt).stroke();
    doc.strokeColor("#000000");
    
    const accountPaneX = vr2X + (8 * pxToPt) + (14 * pxToPt);
    doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
    
    // Account number (top:210px)
    doc.text("Account number: ", accountPaneX, accountStartY);
    doc.font("Helvetica-Bold");
    doc.text("2481197222", accountPaneX + 95 * pxToPt, accountStartY);
    doc.font("Times-Roman");
    doc.text(" (primary account)", accountPaneX + 95 * pxToPt + doc.widthOfString("2481197222"), accountStartY);
    
    // Name (top:229px)
    let accY = accountStartY + 19 * pxToPt;
    doc.font("Helvetica-Bold").fontSize(10 * pxToPt).fillColor("#000000");
    doc.text(fullName, accountPaneX, accY);
    
    // Terms (top:250px)
    accY += 21 * pxToPt;
    doc.font("Times-Italic").fontSize(10 * pxToPt).fillColor("#000000");
    doc.text("California account terms and conditions apply", accountPaneX, accY);
    
    // Direct Deposit (top:270px)
    accY += 20 * pxToPt;
    doc.font("Times-Roman").fontSize(10 * pxToPt).fillColor("#000000");
    doc.text("For Direct Deposit use", accountPaneX, accY);
    
    // Routing Number (top:270px, second line)
    accY += 20 * pxToPt;
    doc.text("Routing Number (RTN): ", accountPaneX, accY);
    doc.font("Helvetica-Bold");
    doc.text("121042882", accountPaneX + 120 * pxToPt, accY);

    // Overdraft Protection section (top:339px, left:54px, font-size:12px, bold)
    let odY = 339 * pxToPt;
    doc.fontSize(12 * pxToPt).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Overdraft Protection", summaryX, odY);
    
    odY += 18 * pxToPt; // top:357px
    doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
    doc.text(
      "This account is not currently covered by Overdraft Protection. If you would like more information regarding Overdraft Protection and eligibility requirements please call the number listed on your statement or visit your Wells Fargo branch.",
      summaryX,
      odY,
      { width: pageWidth - (108 * pxToPt), lineGap: 2 }
    );

    // Thin rule (2px solid #222) - before Transaction history
    odY += 63 * pxToPt; // top:420px
    doc.fillColor("#222222").rect(summaryX, odY, pageWidth - (108 * pxToPt), 2 * pxToPt).fill();

    // Transaction History title (top:420px, left:54px, font-size:12px, bold)
    odY += 8 * pxToPt;
    doc.fontSize(12 * pxToPt).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Transaction history", summaryX, odY);
    
    yPos = 468 * pxToPt; // Table starts at 468px in HTML

    // Table header - EXACT positioning from HTML (Page 2)
    const tableStartX = 54 * pxToPt;
    const tableEndX = pageWidth - (54 * pxToPt);
    
    // Column positions from HTML (converted to points) - EXACT match
    const colPositions = {
      date: 92 * pxToPt,        // 92px in HTML
      check: 186 * pxToPt,      // 186px in HTML
      description: 214 * pxToPt, // 214px in HTML
      deposits: 605 * pxToPt,    // 605px in HTML
      withdrawals: 693 * pxToPt, // 693px in HTML
      balance: 810 * pxToPt,    // 810px in HTML
    };

    // Table header - two-line layout matching HTML exactly (Page 2)
    doc.fontSize(10 * pxToPt).font("Times-Italic").fillColor("#000000");
    
    // First line (453px in HTML)
    const headerLine1Y = (453 * pxToPt);
    doc.text("Check", colPositions.check, headerLine1Y);
    doc.text("Deposits/", colPositions.deposits, headerLine1Y);
    doc.text("Withdrawals/", colPositions.withdrawals, headerLine1Y);
    doc.text("Ending daily", colPositions.balance, headerLine1Y);
    
    // Second line (468px in HTML)
    const headerLine2Y = (468 * pxToPt);
    doc.text("Date", colPositions.date, headerLine2Y);
    doc.text("Number", colPositions.check, headerLine2Y);
    doc.text("Description", colPositions.description, headerLine2Y);
    doc.text("Additions", colPositions.deposits, headerLine2Y);
    doc.text("Subtractions", colPositions.withdrawals, headerLine2Y);
    doc.text("balance", colPositions.balance, headerLine2Y);

    // Bottom border for header (1px solid grey at 483px)
    const headerBottomY = (483 * pxToPt);
    doc.strokeColor("#808080").lineWidth(1);
    doc.moveTo(tableStartX, headerBottomY).lineTo(tableEndX, headerBottomY).stroke();
    doc.strokeColor("#000000");

    yPos = headerBottomY;
    const rowHeight = 13 * pxToPt;

    // Draw transactions
    // Page 2 uses font-size:10px, continuation pages use font-size:10px
    doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
    
    // Column widths from HTML (converted to points)
    const colWidths = {
      date: 70 * pxToPt,
      check: 90 * pxToPt,
      desc: colPositions.deposits - colPositions.description - 10, // Auto width
      dep: 130 * pxToPt,
      wdr: 150 * pxToPt,
      end: 150 * pxToPt,
    };
    
    let rowIndexOnPage = 0; // Track row index for zebra striping (Page 2 starts at 0)
    
    transactions.forEach((transaction: any, i: number) => {
      // Check if we need a new page
      if (yPos + rowHeight > pageHeight - (54 * pxToPt) - 50) {
        doc.addPage();
        pageNum++;
        
        // Header: date + page on left, logo on right (matching HTML design for continuation pages)
        yPos = 41 * pxToPt; // top:41px
        doc.fontSize(10 * pxToPt).font("Times-Roman");
        doc.text(headerDate, 54 * pxToPt, yPos);
        doc.text(`Page ${pageNum} of 10`, 178 * pxToPt, yPos);
        
        // Logo on right (92px = ~61 points)
        const logoSize = 92 * pxToPt;
        const logoX = pageWidth - (54 * pxToPt) - logoSize;
        drawLogo(logoX, yPos, logoSize);
        
        // "Transaction History (continued)" title (top:146px, left:54px, font-size:12px, italic, bold)
        yPos = 146 * pxToPt;
        doc.fontSize(12 * pxToPt).font("Times-BoldItalic").fillColor("#000000");
        doc.text("Transaction History (continued)", 54 * pxToPt, yPos);
        
        // Table header with proper styling (top:177px first line, top:191px second line)
        yPos = 177 * pxToPt;
        
        // Top border (2px solid #222)
        doc.strokeColor("#222222").lineWidth(2);
        doc.moveTo(54 * pxToPt, yPos).lineTo(pageWidth - (54 * pxToPt), yPos).stroke();
        doc.strokeColor("#000000");
        
        yPos += 14 * pxToPt; // top:191px (second line of header)
        
        // Table header - two-line layout matching HTML exactly (font-size:10px, italic)
        doc.fontSize(10 * pxToPt).font("Times-Italic").fillColor("#000000");
        doc.text("Date", colPositions.date, yPos);
        doc.text("Check", colPositions.check, yPos);
        doc.text("Number", colPositions.check, yPos + 14 * pxToPt);
        doc.text("Description", colPositions.description, yPos);
        doc.text("Deposits/", colPositions.deposits, yPos);
        doc.text("Additions", colPositions.deposits, yPos + 14 * pxToPt);
        doc.text("Withdrawals/", colPositions.withdrawals, yPos);
        doc.text("Subtractions", colPositions.withdrawals, yPos + 14 * pxToPt);
        doc.text("Ending daily", colPositions.balance, yPos);
        doc.text("balance", colPositions.balance, yPos + 14 * pxToPt);
        
        // Header bottom border (1.75px solid #222) - after two-line header
        const headerBottomY = yPos + 28 * pxToPt; // Space for two-line header
        doc.strokeColor("#222222").lineWidth(1.75);
        doc.moveTo(54 * pxToPt, headerBottomY).lineTo(pageWidth - (54 * pxToPt), headerBottomY).stroke();
        doc.strokeColor("#000000");
        
        yPos = headerBottomY + 15 * pxToPt; // Start transactions (top:206px)
        rowIndexOnPage = 0; // Reset row index on new page
      }

      const isDeposit = transaction.type === "deposit";
      const isWithdrawal = transaction.type === "withdrawal";
      const showBalance = shouldShowBalance(transaction, i);

      const descriptionText = transaction.description || "";
      const descriptionWidth = colPositions.deposits - colPositions.description - 10;
      
      const rowStartY = yPos;
      const cellPadding = 0; // No padding in HTML
      
      // Measure row height first
      const tempY = doc.y;
      doc.y = rowStartY;
      
      // Date (font-size:10px for continuation pages, 10px for Page 2)
      doc.fontSize(10 * pxToPt).font("Times-Roman");
      doc.text(transaction.date || "", colPositions.date, rowStartY);
      
      // Description
      doc.text(descriptionText, colPositions.description, rowStartY, {
        width: descriptionWidth,
        lineGap: 2,
      });
      
      const textHeight = doc.y - rowStartY;
      const currentRowHeight = Math.max(13 * pxToPt, textHeight + 4); // Row height ~13px
      doc.y = tempY; // Restore
      
      // Zebra striping (even rows on page) - draw before content
      const isEvenRow = rowIndexOnPage % 2 === 0;
      if (isEvenRow) {
        doc.rect(54 * pxToPt, rowStartY - 2, pageWidth - (108 * pxToPt), currentRowHeight + 4)
          .fillColor("#fafafa")
          .fill()
          .fillColor("#000000");
      }
      
      // Now draw the content
      doc.fontSize(10 * pxToPt).font("Times-Roman").fillColor("#000000");
      doc.text(transaction.date || "", colPositions.date, rowStartY);
      
      // Description
      doc.text(descriptionText, colPositions.description, rowStartY, {
        width: descriptionWidth,
        lineGap: 2,
      });
      
      // Deposits (right-aligned)
      if (isDeposit) {
        const amountText = fmt(transaction.amount);
        const amountWidth = doc.widthOfString(amountText);
        doc.text(amountText, colPositions.deposits + colWidths.dep - amountWidth, rowStartY);
      }

      // Withdrawals (right-aligned)
      if (isWithdrawal) {
        const amountText = fmt(transaction.amount);
        const amountWidth = doc.widthOfString(amountText);
        doc.text(amountText, colPositions.withdrawals + colWidths.wdr - amountWidth, rowStartY);
      }

      // Ending balance (right-aligned)
      if (showBalance) {
        const balanceText = fmt(transaction.balance_after);
        const balanceWidth = doc.widthOfString(balanceText);
        doc.text(balanceText, colPositions.balance + colWidths.end - balanceWidth, rowStartY);
      }

      // Bottom border for row (1px solid #e9e9e9)
      const rowBottomY = rowStartY + currentRowHeight;
      doc.strokeColor("#e9e9e9").lineWidth(1);
      doc.moveTo(54 * pxToPt, rowBottomY).lineTo(pageWidth - (54 * pxToPt), rowBottomY).stroke();
      doc.strokeColor("#000000");

      yPos = rowBottomY;
      rowIndexOnPage++; // Increment row index for zebra striping
    });

    // Totals row (if needed - not shown in HTML examples, but keeping for completeness)
    if (yPos + rowHeight > pageHeight - (54 * pxToPt) - 50) {
      doc.addPage();
      pageNum++;
      yPos = 41 * pxToPt;
    }

    const totalsY = yPos;
    doc.font("Helvetica-Bold").fontSize(10 * pxToPt);
    doc.text("Totals", colPositions.date, totalsY);
    
    if (totals.deposits) {
      const amountText = fmt(totals.deposits);
      const amountWidth = doc.widthOfString(amountText);
      doc.text(amountText, colPositions.deposits + colWidths.dep - amountWidth, totalsY);
    }
    
    if (totals.withdrawals) {
      const amountText = fmt(totals.withdrawals);
      const amountWidth = doc.widthOfString(amountText);
      doc.text(amountText, colPositions.withdrawals + colWidths.wdr - amountWidth, totalsY);
    }

    // Bottom border for totals (1px solid #e9e9e9)
    doc.strokeColor("#e9e9e9").lineWidth(1);
    doc.moveTo(54 * pxToPt, totalsY + 13 * pxToPt).lineTo(pageWidth - (54 * pxToPt), totalsY + 13 * pxToPt).stroke();
    doc.strokeColor("#000000");

    // Finalize PDF
    doc.end();
  });
}
