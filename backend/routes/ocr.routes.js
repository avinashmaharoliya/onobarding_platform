const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

router.post('/parse-ocr', auth, async (req, res) => {
  const { raw_text, doc_type } = req.body;

  if (!raw_text || raw_text.trim().length < 10) {
    return res.status(400).json({ message: 'No OCR text provided' });
  }

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    return res.status(503).json({ message: 'Groq API key not configured' });
  }

  const prompt = `You are an expert OCR post-processor for Indian government identity documents (Aadhaar, PAN Card, Passport, Driving Licence) and HR documents.

The input is RAW, NOISY OCR text. Characters may be garbled, words split, or partially misread. Use Indian document layout knowledge to extract only values that are strongly supported by the text.

Document type hint: "${doc_type || 'Unknown'}"

EXTRACTION RULES:
1. Return these exact JSON keys when available: "Full Name", "PAN", "Aadhaar Number", "Father's Name", "Date of Birth", "Gender", "Address".
2. PAN Number: Always 10 chars: 5 uppercase letters + 4 digits + 1 uppercase letter (e.g. ABCDE1234F). Fix common OCR confusion only inside the PAN number.
3. Aadhaar Number: 12 digits, often in groups of 4 (e.g. 1234 5678 9012). Do not invent missing digits.
4. Full Name: On PAN cards, the name appears near/after "Permanent Account Number". On Aadhaar, it is usually above DOB/YOB and below the government header.
5. Father's Name: On PAN cards, appears below the name. Do not confuse it with the employee full name.
6. Date of Birth: Prefer DD/MM/YYYY. Accept DOB/YOB only when visible.
7. Gender: MALE, FEMALE, or OTHER.
8. Address: Multi-line on Aadhaar, includes C/O/S/O/D/O/W/O and often a 6-digit PIN code. Join address lines with comma + space.

IMPORTANT:
- Ignore headers like Government of India, Unique Identification Authority of India, Income Tax Department, and slogans.
- Do not output noisy raw lines as values.
- If a field is uncertain, omit it instead of guessing.
- Return only a flat JSON object. No markdown, no explanation.

Raw OCR text:
"""
${raw_text.substring(0, 2500)}
"""

Example format: {"Full Name": "AVINASH SHARMA", "PAN": "ABCDE1234F", "Father's Name": "RAMESH SHARMA", "Date of Birth": "15/08/1990", "Gender": "MALE", "Address": "C/O RAMESH SHARMA, HISAR, HARYANA - 125001"}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return res.status(502).json({ message: 'Groq API error', detail: err });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return res.status(502).json({ message: 'Empty response from Groq' });

    let parsed;
    try {
      const clean = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error('Failed to parse Groq JSON:', content);
      return res.status(422).json({ message: 'Could not parse LLM response', raw: content });
    }

    res.json({ fields: parsed });
  } catch (error) {
    console.error('Groq fetch error:', error);
    res.status(500).json({ message: 'Server error calling Groq' });
  }
});

module.exports = router;
