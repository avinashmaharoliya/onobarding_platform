const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // 70B — much better at noisy text extraction, still free on Groq

// ── Parse raw OCR text using Groq LLM ────────────────────────────────────────
router.post('/parse-ocr', auth, async (req, res) => {
  const { raw_text, doc_type } = req.body;

  if (!raw_text || raw_text.trim().length < 10) {
    return res.status(400).json({ message: 'No OCR text provided' });
  }

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    // Fallback: return empty so frontend uses regex parser
    return res.status(503).json({ message: 'Groq API key not configured' });
  }

  const prompt = `You are an expert OCR post-processor for Indian government identity documents (Aadhaar, PAN Card, Passport, Driving Licence) and HR documents.

The input is RAW, NOISY OCR text — characters may be garbled, words split, or partially misread. Use your knowledge of Indian document formats to intelligently extract fields despite the noise.

Document type hint: "${doc_type || 'Unknown'}"

EXTRACTION RULES:
1. PAN Number: Always 10 chars — 5 uppercase letters + 4 digits + 1 uppercase letter (e.g. ABCDE1234F). Look for this pattern even if surrounded by noise.
2. Aadhaar Number: 12 digits, often in groups of 4 (e.g. 1234 5678 9012). Last 4 digits may be visible even if others are masked.
3. Full Name: On PAN cards, the name appears AFTER "Permanent Account Number" line. On Aadhaar, after the Govt of India header. It's usually in ALL CAPS or Title Case.
4. Father's Name: On PAN cards, labeled "Father's Name" — appears just below the name. May be garbled but look for it.
5. Date of Birth: Format DD/MM/YYYY. On PAN labeled "Date of Birth", on Aadhaar labeled "DOB".
6. Gender: MALE or FEMALE on Aadhaar cards.
7. Address: Multi-line on Aadhaar, includes pin code (6 digits).

IMPORTANT: The OCR text is noisy. Common errors:
- 'O' confused with '0', 'I' with '1', 'S' with '5'
- Extra spaces or missing spaces in the middle of words
- Words like "faar" likely means "Father", "Anes" likely means "Name"
- Reconstruct the most likely value using context

Raw OCR text:
"""
${raw_text.substring(0, 2000)}
"""

Return ONLY a JSON object with clean, corrected field values. No explanation, no markdown, no code blocks.
Example format: {"Full Name": "AVINASH SHARMA", "PAN": "ABCDE1234F", "Father's Name": "RAMESH SHARMA", "Date of Birth": "15/08/1990"}`;

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

    // Parse JSON from LLM response
    let parsed;
    try {
      // Strip markdown code blocks if model added them anyway
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
