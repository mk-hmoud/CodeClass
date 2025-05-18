import { Request, Response } from 'express';
import pool from '../../config/db';
import { format } from '@fast-csv/format';
import { XMLBuilder } from 'fast-xml-parser';
import JSZip from 'jszip';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [ExportController] [${functionName}] ${message}`);
};

const SUPPORTED_FORMATS = ['csv', 'json', 'xml', 'zip'];

const handleExport = async (req: Request, res: Response, format: string): Promise<void> => {
  if (!SUPPORTED_FORMATS.includes(format.toLowerCase())) {
    res.status(400).json({ error: 'Unsupported export format' });
    return;
  }

  const functionName = `handle${format.toUpperCase()}Export`;
  const client = await pool.connect();
  
  try {
    logMessage(functionName, "Starting export transaction");
    await client.query('BEGIN');

    const { assignmentId } = req.params;
    const { includeFields } = req.body || {};

    if (!assignmentId) {
      throw new Error('Missing assignment ID');
    }

    logMessage(functionName, `Processing export for assignment: ${assignmentId}, with requested fields: ${JSON.stringify(includeFields || 'all')}`);

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
        s.submission_id,
        s.student_id,
        s.code,
        l.name as language,
        s.submitted_at,
        s.final_score as score,
        s.feedback,
        u.username as name,
        u.email
      FROM submissions s
      JOIN students st ON s.student_id = st.student_id
      JOIN users u ON st.user_id = u.user_id
      JOIN languages l ON s.language_id = l.language_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);

    logMessage(functionName, `Fetched ${submissionsRes.rowCount} submissions for assignment ${assignmentId}`);

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
      default:
        throw new Error('Unsupported format');
    }

    await client.query('COMMIT');
    
    const filename = `${safeTitle}_export.${format.toLowerCase()}`;
    
    res.set({
      'Content-Type': getContentType(format),
      'Content-Disposition': `attachment; filename="${filename}"`
    }).send(fileData);

    logMessage(functionName, "Export completed successfully");

  } catch (error) {
    await client.query('ROLLBACK');
    logMessage(functionName, `Export failed: ${error}`);
    
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

const generateCSV = async (data: any[]): Promise<string> => {
  const functionName = "generateCSV";
  logMessage(functionName, "Starting CSV generation");
  logMessage(functionName, `CSV data entries to process: ${data.length}`);
  if (data.length > 0) {
    logMessage(functionName, `CSV data sample (first row): ${JSON.stringify(data[0])}`);
  }
  
  return new Promise((resolve) => {
    const csvStream = format({ headers: true });
    let csvData = '';
    
    csvStream.on('data', chunk => csvData += chunk);
    csvStream.on('end', () => {
      logMessage(functionName, "CSV generation completed");
      resolve(csvData);
    });
    
    data.forEach(row => csvStream.write(row));
    csvStream.end();
  });
};

const generateJSON = (data: any[]): string => {
  logMessage("generateJSON", "Generating JSON export");
  return JSON.stringify(data, null, 2);
};

const generateXML = (data: any[]): string => {
  logMessage("generateXML", "Generating XML export");
  const builder = new XMLBuilder({
    arrayNodeName: "Submission",
    format: true
  });
  return builder.build({ Submissions: { Submission: data } });
};

const generateZIP = async (data: any[], assignmentTitle: string): Promise<Buffer> => {
  const functionName = "generateZIP";
  logMessage(functionName, "Starting ZIP file creation");
  
  const zip = new JSZip();
  const submissionsFolder = zip.folder('submissions');

  if (!submissionsFolder) {
    throw new Error('Failed to create submissions folder in ZIP');
  }

  data.forEach((submission, index) => {
    const fileName = `${(submission.name || `student_${index}`).replace(/[^a-z0-9]/gi, '_')}.${getFileExtension(submission.language)}`;
    submissionsFolder.file(fileName, submission.code || '');
  });

  logMessage(functionName, `Added ${data.length} code files to ZIP`);
  return zip.generateAsync({ type: 'nodebuffer' });
};

const getContentType = (format: string): string => {
  const types: Record<string, string> = {
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip'
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