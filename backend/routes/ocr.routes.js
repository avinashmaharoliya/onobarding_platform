const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192'; // Fast, free, great for structured extraction

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

  const prompt = `You are a document parser for an HR onboarding system.
You will be given raw OCR text extracted from an Indian identity or HR document.
Document type hint: "${doc_type || 'Unknown'}"

Extract ALL readable fields and return ONLY a valid JSON object.
Keys should be human-readable labels (e.g. "Full Name", "Date of Birth", "Aadhaar Number", "PAN", "Address", "Gender", "Father's Name", "Issue Date", "Expiry Date", "Employee ID", etc.)
Only include fields that are actually present in the text. Do not guess.
If a field is partially readable, include it with a "?" suffix on the key.

Raw OCR text:
"""
${raw_text.substring(0, 1500)}
"""

Return ONLY the JSON object, no explanation, no markdown, no code blocks.`;

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
