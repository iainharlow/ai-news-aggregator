// server/services/ai.js

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt templates
const PROMPTS = {
  shortSummary: `
    You are an expert article summarizer tasked with creating a concise summary of the article below.
    
    Create a BRIEF summary of 1-2 sentences that captures the key information.
    Focus on the core message and any unique insights.
    Avoid filler phrases like 'this article discusses' or 'the author explains'.
    Maximize information density with specific details.
    
    ARTICLE:
    {{content}}
  `,
  
  detailedSummary: `
    Extract only meaningful, insightful content from the article below.
    
    Create a detailed summary that captures only the meaningful information.

    Include:
    - Unique or interesting statements and claims
    - Novel insights, perspectives and implications
    - Specific, practical advice for consumers or builders
    - Differences between models; strengths and weaknesses
    - Recent or uncoming releases if they are impactful
    
    Exclude:
    - Common or trite observations (e.g., "AI has potential to disrupt X" / "Companies should plan to include AI")
    - General background information familiar to AI practitioners
    - Filler content and boilerplate descriptions
    
    ONLY return plain text, no markdown. Do not add any filler text, headings or formatting.
    
    ARTICLE:
    {{content}}
  `,
  
  weeklyOverview: `
    Creating a weekly overview of recent AI developments.
    
    Below are summaries from articles published in the past 7 days in the AI field.
    Create a comprehensive overview of substantive developments, releases, and insights/advice from these articles.
    Avoid fuzzy "web copy" language, be very concrete and focus on specific details and advice.
    
    The audience are the staff of an AI development studio. Their role is primarily to imagine, develop and sell AI-powered applications.
    
    Use absolutely no filler language. Be extremely direct and concrete. Your purpose is to inform, not to entertain. 
    Include relevant and genuinely important developments, especially in major model capabilities or applications in finance, insurance or healthcare.
    Be concise and focus on the most important information.
    
    Avoid weak constructions like "suggesting", "emphasizing the need for" or "offering new directions". Instead describe what has happened, what likely will happen, and how businesses should react (if relevant).
    Never describe a model or product as offering improved or enhanced capabilities without describing the specific improvements.
    
    ARTICLES FROM PAST 7 DAYS:
    {{content}}
  `
};

// Model configurations
const MODELS = {
  default: {
    model: "o3-mini",
    max_completion_tokens: 1500
  },
  concise: {
    model: "o3-mini",
    max_completion_tokens: 800
  },
  creative: {
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 2000
  }
};

/**
 * Generate text from a template and content
 * @param {string} template - Template name from PROMPTS
 * @param {string} content - The content to insert into the template
 * @param {string} modelConfig - Configuration name from MODELS
 * @returns {Promise<string>} - The generated text
 */
async function generateText(template, content, modelConfig = 'default') {
  try {
    // Get the prompt template and replace the placeholder
    const promptTemplate = PROMPTS[template];
    if (!promptTemplate) {
      throw new Error(`Unknown prompt template: ${template}`);
    }
    
    const prompt = promptTemplate.replace('{{content}}', content);
    
    // Get the model configuration
    const config = MODELS[modelConfig] || MODELS.default;
    
    // Make the API call
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature,
      max_completion_tokens: config.max_completion_tokens
    });
    
    // Return the generated text
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating text with template ${template}:`, error);
    throw error;
  }
}

/**
 * Generate a short summary of an article
 * @param {string} articleText - The article text
 * @param {string} modelConfig - Configuration name from MODELS
 * @returns {Promise<string>} - The generated summary
 */
async function generateShortSummary(articleText, modelConfig = 'default') {
  return generateText('shortSummary', articleText, modelConfig);
}

/**
 * Generate a detailed summary of an article
 * @param {string} articleText - The article text
 * @param {string} modelConfig - Configuration name from MODELS
 * @returns {Promise<string>} - The generated summary
 */
async function generateDetailedSummary(articleText, modelConfig = 'default') {
  return generateText('detailedSummary', articleText, modelConfig);
}

/**
 * Generate a weekly overview from article summaries
 * @param {string} articleSummaries - Formatted article summaries
 * @param {string} modelConfig - Configuration name from MODELS
 * @returns {Promise<string>} - The generated overview
 */
async function generateWeeklyOverview(articleSummaries, modelConfig = 'default') {
  return generateText('weeklyOverview', articleSummaries, modelConfig);
}

module.exports = {
  generateShortSummary,
  generateDetailedSummary,
  generateWeeklyOverview,
  MODELS, // Export for reference
  PROMPTS // Export for reference
};