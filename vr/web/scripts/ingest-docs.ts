#!/usr/bin/env npx tsx

/**
 * Documentation Ingestion Script
 * 
 * Fetches XR documentation from configured sources, chunks it,
 * generates embeddings, and stores in the vector database.
 * 
 * Usage:
 *   npx tsx scripts/ingest-docs.ts              # Ingest all active sources
 *   npx tsx scripts/ingest-docs.ts --source-id <id>  # Ingest specific source
 *   npx tsx scripts/ingest-docs.ts --seed       # Seed default sources first
 */

import { neon } from '@neondatabase/serverless'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { DEFAULT_DOC_SOURCES } from '../src/lib/chat/types'

// Load environment
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Configuration
const CHUNK_SIZE = 500  // tokens (approximate)
const CHUNK_OVERLAP = 50 // tokens
const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 20 // embeddings per batch
const MAX_PAGES_PER_SOURCE = 100 // increased for deeper indexing
const ENABLE_CRAWLING = true // enable following documentation links

interface DocSource {
  id: string
  name: string
  url: string
  platform: string
  priority: number
  isActive: boolean
}

interface DocChunk {
  content: string
  sourceUrl: string
  title: string
  section?: string
}

// Approximate token count (rough estimate: 4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Split text into chunks
function chunkText(text: string, maxTokens: number, overlapTokens: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  
  let currentChunk = ''
  let currentTokens = 0
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim())
      
      // Keep overlap from end of current chunk
      const words = currentChunk.split(' ')
      const overlapWords = Math.ceil(overlapTokens / 1.5) // rough word estimate
      currentChunk = words.slice(-overlapWords).join(' ') + ' '
      currentTokens = estimateTokens(currentChunk)
    }
    
    currentChunk += sentence + ' '
    currentTokens += sentenceTokens
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(c => c.length > 50) // Filter out tiny chunks
}

// Fetch and parse HTML content
async function fetchContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // More browser-like User-Agent to avoid 403s from some CDNs
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 vr.dev-docs-bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(30000),
    })
    
    if (!response.ok) {
      console.error(`  Failed to fetch ${url}: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, .sidebar, .navigation, #sidebar').remove()
    
    // Get title
    const title = $('h1').first().text() || $('title').text() || url
    
    // Get main content
    const content = $('main, article, .content, .documentation, .doc-content, #content')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
    
    // Fallback to body
    const finalContent = content || $('body').text().replace(/\s+/g, ' ').trim()
    
    return { title: title.trim(), content: finalContent }
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error)
    return null
  }
}

// Extract links from a documentation page
function extractDocLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const links: Set<string> = new Set()
  const base = new URL(baseUrl)
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    
    try {
      const url = new URL(href, baseUrl)
      
      // Only follow links on same domain
      if (url.hostname !== base.hostname) return
      
      // Only follow documentation paths
      if (!url.pathname.includes('/doc') && 
          !url.pathname.includes('/guide') &&
          !url.pathname.includes('/manual') &&
          !url.pathname.includes('/api') &&
          !url.pathname.includes('/reference')) return
      
      // Skip anchors and fragments
      url.hash = ''
      
      links.add(url.toString())
    } catch {
      // Invalid URL, skip
    }
  })
  
  return Array.from(links)
}

// Generate embeddings for chunks
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })
    
    embeddings.push(...response.data.map(d => d.embedding))
    
    // Rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  return embeddings
}

// Store chunks in database
async function storeChunks(
  sourceId: string, 
  chunks: DocChunk[], 
  embeddings: number[][]
): Promise<number> {
  // Clear existing chunks for this source
  await sql`DELETE FROM rag_doc_chunks WHERE source_id = ${sourceId};`
  
  let stored = 0
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = embeddings[i]
    const tokenCount = estimateTokens(chunk.content)
    
    const metadata = JSON.stringify({
      sourceUrl: chunk.sourceUrl,
      title: chunk.title,
      section: chunk.section,
    })
    
    await sql`
      INSERT INTO rag_doc_chunks (source_id, content, embedding, metadata_json, token_count)
      VALUES (
        ${sourceId}, 
        ${chunk.content}, 
        ${`[${embedding.join(',')}]`}::vector,
        ${metadata}::jsonb,
        ${tokenCount}
      );
    `
    stored++
  }
  
  return stored
}

// Update source metadata
async function updateSourceStatus(sourceId: string, chunkCount: number, status: string) {
  await sql`
    UPDATE rag_doc_sources 
    SET 
      chunk_count = ${chunkCount},
      last_indexed = NOW(),
      status = ${status},
      updated_at = NOW()
    WHERE id = ${sourceId};
  `
}

// Ingest a single source
async function ingestSource(source: DocSource): Promise<number> {
  console.log(`\n📚 Ingesting: ${source.name}`)
  console.log(`   URL: ${source.url}`)
  
  const allChunks: DocChunk[] = []
  const visited = new Set<string>()
  const queue = [source.url]
  
  // Simple BFS crawl
  while (queue.length > 0 && visited.size < MAX_PAGES_PER_SOURCE) {
    const url = queue.shift()!
    
    if (visited.has(url)) continue
    visited.add(url)
    
    console.log(`   Fetching (${visited.size}/${MAX_PAGES_PER_SOURCE}): ${url}`)
    
    const result = await fetchContent(url)
    if (!result) continue
    
    // Chunk the content
    const textChunks = chunkText(result.content, CHUNK_SIZE, CHUNK_OVERLAP)
    
    for (const text of textChunks) {
      allChunks.push({
        content: text,
        sourceUrl: url,
        title: result.title,
      })
    }
    
    // Crawl linked documentation pages if enabled
    if (ENABLE_CRAWLING) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 vr.dev-docs-bot/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(30000),
        })
        if (response.ok) {
          const html = await response.text()
          const links = extractDocLinks(html, url)
          queue.push(...links.filter(l => !visited.has(l)))
        }
      } catch {
        // Ignore crawl errors, continue with what we have
      }
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`   Found ${allChunks.length} chunks`)
  
  if (allChunks.length === 0) {
    await updateSourceStatus(source.id, 0, 'empty')
    return 0
  }
  
  // Generate embeddings
  console.log(`   Generating embeddings...`)
  const texts = allChunks.map(c => c.content)
  const embeddings = await generateEmbeddings(texts)
  
  // Store in database
  console.log(`   Storing in database...`)
  const stored = await storeChunks(source.id, allChunks, embeddings)
  
  await updateSourceStatus(source.id, stored, 'indexed')
  
  console.log(`   ✅ Stored ${stored} chunks`)
  return stored
}

// Seed default sources
async function seedDefaults(): Promise<number> {
  console.log('🌱 Seeding default sources...')
  
  let added = 0
  for (const source of DEFAULT_DOC_SOURCES) {
    const existing = await sql`
      SELECT id FROM rag_doc_sources WHERE url = ${source.url} LIMIT 1;
    `
    
    if (existing.length === 0) {
      await sql`
        INSERT INTO rag_doc_sources (name, url, platform, priority, is_active)
        VALUES (${source.name}, ${source.url}, ${source.platform}, ${source.priority}, ${source.isActive});
      `
      console.log(`   Added: ${source.name}`)
      added++
    }
  }
  
  console.log(`   Added ${added} sources`)
  return added
}

// Get all active sources
async function getActiveSources(): Promise<DocSource[]> {
  const rows = await sql`
    SELECT id, name, url, platform, priority, is_active as "isActive"
    FROM rag_doc_sources 
    WHERE is_active = true
    ORDER BY priority ASC;
  `
  return rows as DocSource[]
}

// Main
async function main() {
  const args = process.argv.slice(2)
  
  console.log('🚀 vr.dev Documentation Ingestion')
  console.log('='.repeat(40))
  
  // Check for seed flag
  if (args.includes('--seed')) {
    await seedDefaults()
  }
  
  // Get specific source ID or all
  const sourceIdIndex = args.indexOf('--source-id')
  let sources: DocSource[]
  
  if (sourceIdIndex >= 0 && args[sourceIdIndex + 1]) {
    const sourceId = args[sourceIdIndex + 1]
    const rows = await sql`
      SELECT id, name, url, platform, priority, is_active as "isActive"
      FROM rag_doc_sources 
      WHERE id = ${sourceId};
    `
    sources = rows as DocSource[]
    
    if (sources.length === 0) {
      console.error(`Source not found: ${sourceId}`)
      process.exit(1)
    }
  } else {
    sources = await getActiveSources()
  }
  
  if (sources.length === 0) {
    console.log('\nNo active sources found. Run with --seed to add defaults.')
    process.exit(0)
  }
  
  console.log(`\nFound ${sources.length} source(s) to ingest`)
  
  let totalChunks = 0
  
  for (const source of sources) {
    try {
      const chunks = await ingestSource(source)
      totalChunks += chunks
    } catch (error) {
      console.error(`   ❌ Failed to ingest ${source.name}:`, error)
      await updateSourceStatus(source.id, 0, 'error')
    }
  }
  
  console.log('\n' + '='.repeat(40))
  console.log(`✅ Complete! Ingested ${totalChunks} total chunks`)
}

main().catch(console.error)
