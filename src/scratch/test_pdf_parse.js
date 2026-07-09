const { PDFParse, InvalidPDFException, PasswordException } = require('pdf-parse');
try {
  const uint8 = new Uint8Array(Buffer.from('Hello World'));
  const parser = new PDFParse(uint8);
  parser.getText().then(text => console.log('parsed text:', text)).catch(err => console.log('Promise catch error:', err));
} catch (err) {
  console.log('Direct catch error:', err);
}
