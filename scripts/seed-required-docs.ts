import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run(){
  const want = [
    {code:"ID", name:"Government ID"},
    {code:"BANK", name:"Void Cheque / Bank Letter"},
    {code:"ART", name:"Articles of Incorporation"},
    {code:"STAT", name:"Bank Statements (3m)"},
    {code:"FS", name:"Financial Statements"},
    {code:"TAX", name:"Most Recent Tax Return"},
  ];
  
  const client = await pool.connect();
  try {
    for (const d of want){
      await client.query(
        `INSERT INTO required_documents(code,name,is_active)
         VALUES($1,$2,true)
         ON CONFLICT (code) DO UPDATE SET name=excluded.name`,
        [d.code, d.name]
      );
    }
    console.log("seeded docs:", want.length);
  } finally {
    client.release();
    await pool.end();
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});