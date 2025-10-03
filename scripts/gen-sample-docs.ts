import fs from "fs";
import PDFDocument from "pdfkit";
const OUT="uploads"; if(!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const mk = (name:string, title:string, lines:string[])=>{
  const doc=new PDFDocument({ size:"A4", margin:48 });
  const fp=`${OUT}/${name}.pdf`; const stream=fs.createWriteStream(fp); doc.pipe(stream);
  doc.fontSize(18).text(title,{underline:true}); doc.moveDown();
  doc.fontSize(12); for(const l of lines) doc.text(l); doc.end();
  stream.on("finish",()=>console.log("✓",fp));
};
mk("bank_statement_may","Bank Statement – May 2025",[
  "Account: 000111222","Balance: 45,200.18 CAD","Bank: Example Bank"
]);
mk("balance_sheet_2024","Balance Sheet – FY2024",[
  "Assets: 1,250,000","Liabilities: 820,000","Equity: 430,000"
]);
mk("tax_return_2024","Corporate Tax Return – 2024",[
  "BN: 123456789","Net Income: 210,000","Filed: 2025-03-15"
]);
mk("invoice_sample","Invoice #INV-1029",[
  "Amount: 12,480 CAD","Customer: Northwind","Due: 2025-09-15"
]);