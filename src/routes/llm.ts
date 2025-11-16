import express from 'express';
import { llmService } from '../utils/llm';
import { requireAuthenticated } from '../middleware/requireAdmin';

const router = express.Router();

// POST /llm/suggestions - Generate LLM suggestions for post creation
router.post('/suggestions', requireAuthenticated, async (req, res) => {
  try {
    const {
      fieldType,
      context = {},
      currentValue = ''
    } = req.body;

    // Validate input
    if (!fieldType) {
      return res.status(400).json({ error: 'fieldType is required' });
    }

    const validFieldTypes = ['title', 'excerpt', 'content', 'seo_title', 'seo_description', 'seo_keywords'];
    if (!validFieldTypes.includes(fieldType)) {
      return res.status(400).json({ error: `Invalid fieldType. Must be one of: ${validFieldTypes.join(', ')}` });
    }

    // Extract context from request
    const suggestionContext = {
      category: context.category || undefined,
      tags: Array.isArray(context.tags) ? context.tags : undefined,
      title: context.title || undefined,
      excerpt: context.excerpt || undefined,
      author: context.author || undefined
    };

    const suggestions = await llmService.generateSuggestions({
      fieldType,
      context: suggestionContext,
      currentValue: typeof currentValue === 'string' ? currentValue : ''
    });

    res.json(suggestions);
  } catch (error) {
    console.error('LLM suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
