declare module 'pdf-parse' {
  interface PdfParseResult { text: string; numpages: number; info?: unknown; metadata?: unknown }
  function pdfParse(buffer: Buffer, options?: Record<string, unknown>): Promise<PdfParseResult>;
  export default pdfParse;
}
