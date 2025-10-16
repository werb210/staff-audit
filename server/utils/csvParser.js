import fs from 'fs';
import { parse } from 'csv-parse';
import ExcelJS from 'exceljs';

export async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        // Parse CSV file
        const results = [];
        
        fs.createReadStream(filePath)
          .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
          }))
          .on('data', (data) => results.push(data))
          .on('end', () => {
            // Clean up temp file
            fs.unlink(filePath, () => {});
            resolve(results);
          })
          .on('error', reject);
          
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        // Parse Excel file with ExcelJS (more secure than xlsx)
        const workbook = new ExcelJS.Workbook();
        
        workbook.xlsx.readFile(filePath).then(() => {
          const worksheet = workbook.getWorksheet(1); // Get first worksheet
          
          if (!worksheet) {
            fs.unlink(filePath, () => {});
            return reject(new Error('Excel file has no worksheets'));
          }
          
          const jsonData = [];
          worksheet.eachRow((row, rowNumber) => {
            const rowData = [];
            row.eachCell((cell, colNumber) => {
              rowData[colNumber - 1] = cell.value || '';
            });
            jsonData.push(rowData);
          });
          
          if (jsonData.length < 2) {
            fs.unlink(filePath, () => {});
            return reject(new Error('Excel file must have at least header row and one data row'));
          }
          
          // Convert to object format using first row as headers
          const headers = jsonData[0];
          const results = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          // Clean up temp file
          fs.unlink(filePath, () => {});
          resolve(results);
          
        }).catch(error => {
          fs.unlink(filePath, () => {});
          reject(error);
        });
        
      } else {
        reject(new Error('Unsupported file format'));
      }
      
    } catch (error) {
      // Clean up temp file on error
      fs.unlink(filePath, () => {});
      reject(error);
    }
  });
}