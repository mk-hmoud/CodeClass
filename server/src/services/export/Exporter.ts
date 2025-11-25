import { Request, Response } from 'express';
import pool from '../../config/db';
import { format } from '@fast-csv/format';
import { XMLBuilder } from 'fast-xml-parser';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import PDFKit from 'pdfkit';
import logger from '../../config/logger';

const SUPPORTED_FORMATS = ['csv', 'json', 'xml', 'zip', 'excel', 'pdf'];

const handleExport = async (req: Request, res: Response, format: string): Promise<void> => {
  if (!SUPPORTED_FORMATS.includes(format.toLowerCase())) {
    res.status(400).json({ error: 'Unsupported export format' });
    return;
  }

  const fn = `handle${format.toUpperCase()}Export`;
  const client = await pool.connect();
  
  try {
    logger.info({ fn }, "Starting export transaction");
    await client.query('BEGIN');

    const { assignmentId } = req.params;
    const { includeFields } = req.body || {};

    if (!assignmentId) {
      throw new Error('Missing assignment ID');
    }

    logger.info(
      { fn, assignmentId, includeFields: includeFields ?? 'all' },
      "Processing export request"
    );

    const assignmentRes = await client.query(
      'SELECT title FROM assignments WHERE assignment_id = $1',
      [assignmentId]
    );

    if (assignmentRes.rowCount === 0) {
      throw new Error('Assignment not found');
    }

    const assignmentTitle = assignmentRes.rows[0].title || 'assignment';
    const safeTitle = assignmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const submissionsRes = await client.query(`
      SELECT 
        s.submission_id AS "submissionId",
        s.student_id,
        s.code,
        l.name as language,
        s.submitted_at,
        s.final_score as score,
        s.feedback,
        COALESCE(
            NULLIF(
                CONCAT_WS(' ', u.first_name, u.last_name),
                ''
            ),
            u.username
            ) AS name,
        u.email
      FROM submissions s
      JOIN students st ON s.student_id = st.student_id
      JOIN users u ON st.user_id = u.user_id
      JOIN languages l ON s.language_id = l.language_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);

    logger.info(
      { fn, assignmentId, count: submissionsRes.rowCount },
      "Fetched submissions for export"
    );

    const filteredData = submissionsRes.rows.map(row => {
      const result: Record<string, any> = {};
      
      if (Array.isArray(includeFields) && includeFields.length > 0) {
        includeFields.forEach(field => {
          const fieldMapping: Record<string, string> = {
            'studentId': 'student_id',
            'name': 'name',
            'email': 'email',
            'score': 'score',
            'feedback': 'feedback',
            'timestamp': 'submitted_at',
          };
          
          const mappedField = fieldMapping[field] || field;
          if (mappedField in row) {
            result[field] = row[mappedField]; 
          }
        });
      } else {
        Object.entries(row).forEach(([key, value]) => {
          const reverseMapping: Record<string, string> = {
            'student_id': 'studentId',
            'submitted_at': 'timestamp',
            'score': 'score',
            'feedback': 'feedback',
          };
          
          const outputKey = reverseMapping[key] || key;
          result[outputKey] = value;
        });
      }
      
      return result;
    });

    let fileData: string | Buffer;
    switch(format.toLowerCase()) {
      case 'csv':
        fileData = await generateCSV(filteredData);
        break;
      case 'json':
        fileData = generateJSON(filteredData);
        break;
      case 'xml':
        fileData = generateXML(filteredData);
        break;
      case 'zip':
        fileData = await generateZIP(filteredData, safeTitle);
        break;
      case 'excel':
        fileData = await generateExcel(filteredData, assignmentTitle);
        break;
      case 'pdf':
        fileData = await generatePDF(filteredData, assignmentTitle);
        break;
      default:
        throw new Error('Unsupported format');
    }

    await client.query('COMMIT');
    
    const filename = `${safeTitle}_export.${format === 'excel' ? 'xlsx' : format.toLowerCase()}`;
    
    res.set({
      'Content-Type': getContentType(format),
      'Content-Disposition': `attachment; filename="${filename}"`
    }).send(fileData);

    logger.info({ fn, assignmentId, filename }, "Export completed successfully");

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ fn, error, assignmentId: req.params.assignmentId }, "Export failed");
    res.status(500).json(error);
  } finally {
    client.release();
  }
};

export const exportCSVHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'csv');

export const exportJSONHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'json');

export const exportXMLHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'xml');

export const exportZIPHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'zip');

export const exportExcelHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'excel');

export const exportPDFHandler = (req: Request, res: Response): Promise<void> => 
  handleExport(req, res, 'pdf');

const generateCSV = async (data: any[]): Promise<string> => {
  const fn = "generateCSV";
  logger.info({ fn, rows: data.length }, "Starting CSV generation");
  if (data.length > 0) {
    logger.debug({ fn, sample: data[0] }, "CSV data sample (first row)");
  }
  
  return new Promise((resolve) => {
    const csvStream = format({ headers: true });
    let csvData = '';
    
    csvStream.on('data', chunk => csvData += chunk);
    csvStream.on('end', () => {
      logger.info({ fn }, "CSV generation completed");
      resolve(csvData);
    });
    
    data.forEach(row => csvStream.write(row));
    csvStream.end();
  });
};

const generateJSON = (data: any[]): string => {
  const fn = "generateJSON";
  logger.info({ fn, rows: data.length }, "Generating JSON export");
  return JSON.stringify(data, null, 2);
};

const generateXML = (data: any[]): string => {
  const fn = "generateXML";
  logger.info({ fn, rows: data.length }, "Generating XML export");
  const builder = new XMLBuilder({
    arrayNodeName: "Submission",
    format: true
  });
  return builder.build({ Submissions: { Submission: data } });
};

const generateZIP = async (data: any[], assignmentTitle: string): Promise<Buffer> => {
  const fn = "generateZIP";
  logger.info({ fn, rows: data.length }, "Starting ZIP file creation");
  
  const zip = new JSZip();
  const submissionsFolder = zip.folder('submissions');

  if (!submissionsFolder) {
    throw new Error('Failed to create submissions folder in ZIP');
  }

  data.forEach((submission, index) => {
    const fileName = `${(submission.name || `student_${index}`).replace(/[^a-z0-9]/gi, '_')}.${getFileExtension(submission.language)}`;
    submissionsFolder.file(fileName, submission.code || '');
  });

  logger.info({ fn, fileCount: data.length }, "Added code files to ZIP");
  return zip.generateAsync({ type: 'nodebuffer' });
};

//excel and pdf generation are completely taken from stackoverflow and integrated with ai.
//i dont know how it works.

const generateExcel = async (
  data: any[],
  assignmentTitle: string
): Promise<Buffer> => {
  const fn = "generateExcel";
  logger.info({ fn, rows: data.length }, "Starting Excel generation");

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(assignmentTitle);

  if (data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map((key) => ({
      header: key,
      key,
    }));
    worksheet.addRows(data);

    worksheet.columns.forEach((column) => {
      let maxLength = column.header?.toString().length ?? 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value?.toString().length ?? 10;
        if (len > maxLength) maxLength = len;
      });
      column.width = maxLength + 2;
    });
  }

  logger.info({ fn, rows: data.length }, "Excel workbook created");

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
};

const generatePDF = async (data: any[], assignmentTitle: string): Promise<Buffer> => {
  const fn = "generatePDF";
  logger.info({ fn, rows: data.length }, "Starting PDF generation");
  
  return new Promise((resolve) => {
    const chunks: any[] = [];
    const doc = new PDFKit({ 
      margin: 40,
      size: 'A4',
      layout: 'landscape' 
    });
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      logger.info({ fn }, "PDF generation completed");
      resolve(result);
    });
    
    doc.fontSize(20)
       .fillColor('#333333')
       .text(`Assignment: ${assignmentTitle}`, { align: 'center' });
    doc.moveDown(1.5);
    
    if (data.length === 0) {
      doc.fontSize(12).text('No submissions found', { align: 'center' });
    } else {
      data.forEach((row, index) => {
        if (index > 0 && doc.y > doc.page.height - 150) {
          doc.addPage();
        }
        
        if (index > 0) {
          doc.moveTo(40, doc.y)
             .lineTo(doc.page.width - 40, doc.y)
             .stroke('#cccccc');
          doc.moveDown(0.5);
        }
        
        doc.fontSize(14)
           .fillColor('#444444')
           .text(`Submission ${index + 1}: ${row.name || 'Unknown Student'}`, { underline: true });
        doc.moveDown(0.5);
        
        Object.entries(row).forEach(([key, value]) => {
          if (key === 'name') return;
          
          const displayValue = formatValueForPDF(key, value);
          
          doc.fontSize(10)
             .fillColor('#000000')
             .text(`${formatLabel(key)}: `, { 
               continued: true,
               width: 120
             })
             .fillColor('#555555')
             .text(`${displayValue}`, { 
               width: doc.page.width - 180,
               align: 'left'  
             });
          
          if (key === 'code') {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(1);
      });
    }
    
    doc.end();
  });
};


 const formatValueForPDF = (key: string, value: any): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  switch (key) {
    case 'code':
      const codeStr = String(value);
      return codeStr.length > 300 
        ? codeStr.substring(0, 300) + '...' 
        : codeStr;
      
    case 'score':
      return typeof value === 'number' 
        ? value.toFixed(2) 
        : String(value);
      
    case 'timestamp':
    case 'submitted_at':
      try {
        const date = new Date(value);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return String(value);
      }
      
    default:
      return String(value);
  }
};

 const formatLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    submission_id: 'Submission ID',
    student_id: 'Student ID',
    studentId: 'Student ID',
    code: 'Code',
    language: 'Language',
    submitted_at: 'Submitted At',
    timestamp: 'Submitted At',
    score: 'Score',
    feedback: 'Feedback',
    name: 'Student Name',
    email: 'Email'
  };
  
  return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
};

const getContentType = (format: string): string => {
  const types: Record<string, string> = {
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf'
  };
  return types[format.toLowerCase()] || 'text/plain';
};

const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    'python': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'c': 'c',
    'cpp': 'cpp',
  };
  return extensions[language.toLowerCase()] || 'txt';
};