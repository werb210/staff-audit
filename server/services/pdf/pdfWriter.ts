import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import MarkdownIt from 'markdown-it';

export interface PDFOptions {
  header?: string;
  footer?: string;
  title?: string;
  author?: string;
  subject?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class PDFWriterService {
  private mdParser: MarkdownIt;

  constructor() {
    this.mdParser = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true
    });
  }

  // Main function to generate PDF from markdown
  async generatePDFFromMarkdown(
    markdown: string, 
    options: PDFOptions = {}
  ): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Set document metadata
      if (options.title) pdfDoc.setTitle(options.title);
      if (options.author) pdfDoc.setAuthor(options.author);
      if (options.subject) pdfDoc.setSubject(options.subject);
      pdfDoc.setCreator('Boreal Financial - AI Document System');

      // Set default margins
      const margins = options.margins || {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      };

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Parse markdown content
      const content = this.parseMarkdownToPDFContent(markdown);

      // Create pages and render content
      await this.renderContentToPDF(pdfDoc, content, font, boldFont, options, margins);

      return await pdfDoc.save();

    } catch (error) {
      console.error('[PDF-WRITER] Error generating PDF:', error);
      throw new Error('Failed to generate PDF from markdown');
    }
  }

  // Parse markdown into structured content
  private parseMarkdownToPDFContent(markdown: string): PDFContentElement[] {
    const content: PDFContentElement[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        content.push({ type: 'spacer', height: 10 });
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        content.push({
          type: 'heading',
          level: 1,
          text: trimmed.substring(2),
          fontSize: 18,
          isBold: true
        });
      } else if (trimmed.startsWith('## ')) {
        content.push({
          type: 'heading',
          level: 2,
          text: trimmed.substring(3),
          fontSize: 16,
          isBold: true
        });
      } else if (trimmed.startsWith('### ')) {
        content.push({
          type: 'heading',
          level: 3,
          text: trimmed.substring(4),
          fontSize: 14,
          isBold: true
        });
      }
      // Bold text
      else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        content.push({
          type: 'text',
          text: trimmed.substring(2, trimmed.length - 2),
          fontSize: 12,
          isBold: true
        });
      }
      // List items
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        content.push({
          type: 'list-item',
          text: trimmed.substring(2),
          fontSize: 11,
          isBold: false,
          indent: 20
        });
      }
      // Regular text
      else {
        content.push({
          type: 'text',
          text: trimmed,
          fontSize: 11,
          isBold: false
        });
      }
    }

    return content;
  }

  // Render content to PDF pages
  private async renderContentToPDF(
    pdfDoc: PDFDocument,
    content: PDFContentElement[],
    font: PDFFont,
    boldFont: PDFFont,
    options: PDFOptions,
    margins: { top: number; bottom: number; left: number; right: number }
  ): Promise<void> {
    let currentPage = pdfDoc.addPage();
    let { width, height } = currentPage.getSize();
    let currentY = height - margins.top;

    // Add header to first page
    if (options.header) {
      this.addHeader(currentPage, options.header, font, margins, width);
      currentY -= 30; // Adjust for header
    }

    for (const element of content) {
      // Check if we need a new page
      const elementHeight = this.calculateElementHeight(element);
      
      if (currentY - elementHeight < margins.bottom + 30) { // 30 for footer
        // Add footer to current page
        if (options.footer) {
          this.addFooter(currentPage, options.footer, font, margins, height);
        }

        // Create new page
        currentPage = pdfDoc.addPage();
        ({ width, height } = currentPage.getSize());
        currentY = height - margins.top;

        // Add header to new page
        if (options.header) {
          this.addHeader(currentPage, options.header, font, margins, width);
          currentY -= 30;
        }
      }

      // Render element
      currentY = this.renderElement(
        currentPage, 
        element, 
        font, 
        boldFont, 
        margins.left, 
        currentY, 
        width - margins.left - margins.right
      );
    }

    // Add footer to last page
    if (options.footer) {
      this.addFooter(currentPage, options.footer, font, margins, height);
    }
  }

  // Add header to page
  private addHeader(
    page: PDFPage, 
    headerText: string, 
    font: PDFFont, 
    margins: any, 
    pageWidth: number
  ): void {
    page.drawText(headerText, {
      x: margins.left,
      y: page.getSize().height - 30,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.6)
    });

    // Add a line under header
    page.drawLine({
      start: { x: margins.left, y: page.getSize().height - 40 },
      end: { x: pageWidth - margins.right, y: page.getSize().height - 40 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
  }

  // Add footer to page
  private addFooter(
    page: PDFPage, 
    footerText: string, 
    font: PDFFont, 
    margins: any, 
    pageHeight: number
  ): void {
    // Add a line above footer
    page.drawLine({
      start: { x: margins.left, y: 40 },
      end: { x: page.getSize().width - margins.right, y: 40 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });

    page.drawText(footerText, {
      x: margins.left,
      y: 25,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Add page number - simplified approach
    const pageCount = page.doc.getPages().length;
    const pageNumber = `Page ${pageCount}`;
    page.drawText(pageNumber, {
      x: page.getSize().width - margins.right - 50,
      y: 25,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  // Calculate height needed for an element
  private calculateElementHeight(element: PDFContentElement): number {
    switch (element.type) {
      case 'heading':
        return element.level === 1 ? 30 : element.level === 2 ? 25 : 20;
      case 'text':
      case 'list-item':
        return 18;
      case 'spacer':
        return element.height || 10;
      default:
        return 18;
    }
  }

  // Render individual element
  private renderElement(
    page: PDFPage,
    element: PDFContentElement,
    font: PDFFont,
    boldFont: PDFFont,
    x: number,
    y: number,
    maxWidth: number
  ): number {
    switch (element.type) {
      case 'heading':
        page.drawText(element.text || '', {
          x,
          y,
          size: element.fontSize || 14,
          font: element.isBold ? boldFont : font,
          color: rgb(0.1, 0.1, 0.1)
        });
        return y - (element.fontSize || 14) - 8;

      case 'text':
        const lines = this.wrapText(element.text || '', maxWidth, element.fontSize || 11, font);
        let currentY = y;
        
        for (const line of lines) {
          page.drawText(line, {
            x,
            y: currentY,
            size: element.fontSize || 11,
            font: element.isBold ? boldFont : font,
            color: rgb(0, 0, 0)
          });
          currentY -= (element.fontSize || 11) + 2;
        }
        return currentY - 5;

      case 'list-item':
        // Draw bullet point
        page.drawText('•', {
          x,
          y,
          size: element.fontSize || 11,
          font,
          color: rgb(0, 0, 0)
        });

        // Draw text with indent
        const listLines = this.wrapText(element.text || '', maxWidth - 20, element.fontSize || 11, font);
        let listY = y;
        
        for (const line of listLines) {
          page.drawText(line, {
            x: x + 15,
            y: listY,
            size: element.fontSize || 11,
            font: element.isBold ? boldFont : font,
            color: rgb(0, 0, 0)
          });
          listY -= (element.fontSize || 11) + 2;
        }
        return listY - 5;

      case 'spacer':
        return y - (element.height || 10);

      default:
        return y;
    }
  }

  // Simple text wrapping (basic implementation)
  private wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }
}

// Content element interface
interface PDFContentElement {
  type: 'heading' | 'text' | 'list-item' | 'spacer';
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  level?: number;
  height?: number;
  indent?: number;
}

export const pdfWriterService = new PDFWriterService();