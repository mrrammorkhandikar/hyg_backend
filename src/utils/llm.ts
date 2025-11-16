import axios from 'axios';

interface LLMSuggestionRequest {
  fieldType: 'title' | 'excerpt' | 'content' | 'seo_title' | 'seo_description' | 'seo_keywords';
  context?: {
    category?: string;
    tags?: string[];
    title?: string;
    excerpt?: string;
    author?: string;
    content?: string;
  };
  currentValue?: string;
}

interface LLMSuggestionResponse {
  suggestions: string[];
  placeholder: string;
}

export class LLMService {
  private apiKey: string;
  private apiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  private model: string = 'meta-llama/llama-3.3-70b-instruct:free';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenRouter API key not found. LLM suggestions will be disabled.');
    }
  }

  async generateSuggestions(request: LLMSuggestionRequest): Promise<LLMSuggestionResponse> {
    if (!this.apiKey) {
      return this.getFallbackSuggestions(request);
    }

    try {
      const prompt = this.buildPrompt(request);

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://google.com',
            'X-Title': 'The Blog'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseSuggestions(content, request.fieldType);

    } catch (error) {
      console.error('LLM API error:', error);
      return this.getFallbackSuggestions(request);
    }
  }

  private buildPrompt(request: LLMSuggestionRequest): string {
    const { fieldType, context, currentValue } = request;
    const niche = 'dental health and wellness, focusing on treatments, prevention, and patient education';
    const isExistingValue = currentValue && currentValue.trim().length > 0;

    let prompt = `You are a friendly, experienced dental professional helping patients understand and improve their oral health. Your suggestions should be engaging, informative, and written in a semi-professional tone - like talking to a knowledgeable friend. Focus on being helpful, approachable, and providing real value.

Key Guidelines:
- Use conversational language that's easy to understand
- Be encouraging and supportive
- Provide practical, actionable advice
- Avoid intimidating medical jargon when possible
- Make suggestions that feel like personal recommendations from a trusted dental advisor
- Be specific and tailored to the individual patient's needs based on what's already written

ANALYZE ALL EXISTING CONTEXT first:`;

    if (context?.content && context.content.length > 50) {
      prompt += `\n\nEXISTING CONTENT THEME: "${context.content.substring(0, 800)}..."\n`;
    }
    if (context?.title) prompt += `\nTITLE: "${context.title}"`;
    if (context?.excerpt) prompt += `\nCURRENT EXCERPT: "${context.excerpt}"`;

    switch (fieldType) {
      case 'title':
        prompt += `\n\n💡 CONVERSATIONAL POST TITLE IDEAS (suggest 2-3 engaging, friendly titles that would make someone want to click and read about this topic):`;
        if (isExistingValue) {
          prompt += `\n\nThe patient's currently typing: "${currentValue}" - suggest completions that build on their direction.`;
        }
        prompt += `\n\nThink about what specific concern, procedure, or information this post aims to help with. Create titles that sound like a helpful friend saying "Hey, if you're dealing with [topic], you definitely want to read this!"`;
        break;

      case 'excerpt':
        prompt += `\n\n📝 ENGAGING SUMMARY PARAGRAPHS (suggest 2-3 welcoming excerpts that make patients feel supported and informed):`;
        if (isExistingValue) {
          prompt += `\n\nPatient's current draft: "${currentValue}" - enhance what they've written with encouragement and completeness.`;
        }
        prompt += `\n\nWrite summaries that feel like: "I know dealing with [topic] can be overwhelming, but here's everything you need to know to get started..."`;
        break;

      case 'content':
        prompt += `\n\n✍️ DETAILED CONTENT SUGGESTIONS (suggest 2-3 content blocks that naturally continue or expand the patient's writing):`;
        if (isExistingValue) {
          prompt += `\n\nPatient's current writing: "${currentValue}" - suggest content that flows naturally from what they've written.`;
        }
        prompt += `\n\nThink like a dental professional writing for patients. Suggest content blocks that:
- Address common questions or concerns
- Provide step-by-step guidance
- Share practical tips based on professional experience
- Include reassuring information to reduce patient anxiety
- Cover related topics that naturally follow from what's already written

Make suggestions feel like direct advice from a trusted dental professional.`;
        break;

      case 'seo_title':
        prompt += `\n\n🔍 SEARCH-OPTIMIZED TITLES (suggest 2-3 titles that people would actually type into Google when looking for dental help):`;
        if (isExistingValue) {
          prompt += `\n\nPatient's current SEO title idea: "${currentValue}" - refine for better search visibility.`;
        }
        prompt += `\n\nFocus on question-based titles that capture real patient searches like:
"Are you wondering about [specific procedure]?"
"How to handle [common dental concern]"
"What you need to know about [treatment option]"

Keep under 60 characters - these are the headlines that appear in search results!`;
        break;

      case 'seo_description':
        prompt += `\n\n💬 COMPELLING META DESCRIPTIONS (suggest 2-3 engaging descriptions that would make someone want to click from search results):`;
        if (isExistingValue) {
          prompt += `\n\nPatient's current meta description draft: "${currentValue}" - polish for maximum click appeal.`;
        }
        prompt += `\n\nWrite descriptions that address real patient concerns with encouraging, helpful tones like:
"Struggling with [dental issue]? Here's the straightforward guide you've been looking for..."
"Everything dentists wish patients knew about [procedure] - explained simply and completely"
"Don't let [dental concern] ruin your confidence - learn proven solutions today"

Aim for 120-160 characters. Focus on benefits and solutions, not just procedures.`;
        break;

      case 'seo_keywords':
        prompt += `\n\n🎯 TARGETED KEYWORDS (suggest 5-8 specific terms people would search for when dealing with this dental topic):`;
        if (isExistingValue) {
          prompt += `\n\nPatient's current keywords: "${currentValue}" - enhance with more specific, searchable terms.`;
        }
        prompt += `\n\nAnalyze the specific procedures, conditions, or information covered. Think about:
- What painful symptoms or concerns would bring someone to Google
- Names of specific treatments or procedures mentioned
- Everyday language patients use for their dental issues
- Age/group specific concerns (children, adults, seniors)
- Associated dental problems that often occur together

Focus on long-tail keywords that show real intent, like:
"how to stop tooth sensitivity when drinking cold water"
"what causes gum swelling around wisdom teeth"
"dentist recommended remedy for dry mouth at night"

Avoid generic keywords - be as specific as possible to match real patient searches.`;
        break;
    }

    prompt += `\n\n🎨 STYLING NOTES:
- Use natural, conversational language
- Include empathetic phrases: "I understand...", "Many patients wonder...", "It's completely normal to feel..."
- Focus on benefits and outcomes, not just procedures
- Make complex topics feel understandable and manageable
- Include reassurance and encouragement throughout
- Write as if you're having a one-on-one conversation with a concerned patient`;

    return prompt;
  }

  private parseSuggestions(content: string, fieldType: string): LLMSuggestionResponse {
    let suggestions: string[] = [];
    let placeholder = '';

    // Parse numbered lists (for title, excerpt, content, seo_title, seo_description)
    if (fieldType === 'seo_keywords') {
      // Handle comma-separated keywords
      suggestions = content.split(',').map(k => k.trim()).filter(k => k.length > 0);
      placeholder = suggestions.length ? suggestions[0] : 'dental care, oral health, teeth whitening, prevention';
    } else {
      // Parse numbered lists
      const lines = content.split('\n').filter(line => line.trim());
      const numberedLines = lines.filter(line => /^\d+\.\s/.test(line) || /^-\s/.test(line));

      suggestions = numberedLines.map(line => {
        return line.replace(/^\d+\.\s|^-\s/, '').replace(/[""]/g, '').trim();
      }).filter(s => s.length > 0);

      // Generate placeholder from first suggestion
      placeholder = suggestions.length ? suggestions[0] : this.getDefaultPlaceholder(fieldType);
    }

    // Limit suggestions and ensure quality
    suggestions = suggestions.slice(0, 3);

    return { suggestions, placeholder };
  }

  private getDefaultPlaceholder(fieldType: string): string {
    const placeholders = {
      title: 'The Complete Guide to Dental Health Care',
      excerpt: 'Discover essential tips for maintaining optimal oral health and preventing common dental issues.',
      content: 'Dental care is crucial for overall health. Regular checkups and proper hygiene can prevent many serious conditions.',
      seo_title: 'The Complete Guide to Dental Health Care',
      seo_description: 'Discover essential tips for maintaining optimal oral health and preventing common dental issues.',
      seo_keywords: 'dental care, oral health, teeth cleaning, dental tips, dental health'
    };
    return placeholders[fieldType as keyof typeof placeholders] || '';
  }

  private getFallbackSuggestions(request: LLMSuggestionRequest): LLMSuggestionResponse {
    const fallbacks = {
      title: {
        suggestions: [
          'Essential Dental Care Tips for Better Oral Health',
          'Understanding Common Dental Treatments and Procedures',
          'Preventing Dental Problems: A Complete Guide'
        ],
        placeholder: 'Essential Dental Care Tips for Better Oral Health'
      },
      excerpt: {
        suggestions: [
          'Learn the fundamental practices that ensure healthy teeth and gums for life.',
          'Discover comprehensive information about various dental treatments and their benefits.',
          'Get expert advice on preventing dental issues before they become serious.'
        ],
        placeholder: 'Learn the fundamental practices that ensure healthy teeth and gums for life.'
      },
      content: {
        suggestions: [
          'Proper dental hygiene begins with daily brushing and flossing routines.',
          'Regular dental visits are essential for early detection and prevention of oral diseases.',
          'Understanding different dental procedures helps reduce anxiety and promotes better health decisions.'
        ],
        placeholder: 'Proper dental hygiene begins with daily brushing and flossing routines.'
      },
      seo_title: {
        suggestions: [
          'Essential Dental Care Tips',
          'Complete Oral Health Guide',
          'Prevent Dental Problems Now'
        ],
        placeholder: 'Essential Dental Care Tips'
      },
      seo_description: {
        suggestions: [
          'Learn essential dental care tips for better oral health and a brighter smile.',
          'Comprehensive guide to oral health, dental treatments, and preventive care.',
          'Expert dental advice to prevent problems and maintain healthy teeth.'
        ],
        placeholder: 'Learn essential dental care tips for better oral health and a brighter smile.'
      },
      seo_keywords: {
        suggestions: ['dental care', 'oral health', 'dental hygiene', 'preventive dentistry', 'dental tips'],
        placeholder: 'dental care, oral health, dental hygiene'
      }
    };

    return fallbacks[request.fieldType as keyof typeof fallbacks] || {
      suggestions: ['Sample suggestion'],
      placeholder: 'Sample placeholder'
    };
  }
}

export const llmService = new LLMService();
