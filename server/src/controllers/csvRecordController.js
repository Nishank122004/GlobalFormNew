import * as csvRecordService from '../services/csvRecordService.js';

export async function getCsvRecord(req, res, next) {
  const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Enter a valid username.' });
  }
  try {
    res.set('Cache-Control', 'no-store');
    const record = await csvRecordService.findCsvRecordByUsername(username);
    if (!record) return res.status(404).json({ success: false, message: 'No matching record found.' });
    return res.status(200).json({ success: true, message: 'Record retrieved successfully.', data: record });
  } catch (error) { return next(error); }
}
