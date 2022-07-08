const { Client } = require('@notionhq/client')
const SUPPORTED_BLOCK_TYPES = [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list_item',
  'numbered_list_item',
  'to_do',
]

const BLOCKS_TO_JOIN = ['bulleted_list_item', 'numbered_list_item', 'to_do']

const exportNotesFromNotion = async (url, secret) => {
  const pageId = _getPageId({ url })

  const pageTitle = await _getPageTitle({ pageId, secret })
  const pageBlocks = await _getAllChildrenBlocksOfPage({ pageId, secret })

  const highlights = _getHighlightsFromBlocks({ pageBlocks })

  return { title: pageTitle, pageId, highlights }
}

function _getNotionClient(secret) {
  const notion = new Client({ auth: `${secret}` })
  return notion
}

function _getPageId({ url }) {
  const regexp =
    /https:\/\/(www\.)?notion\.so\/.*-[a-zA-Z]+-([\w]+)(.*?p=([\w]+))?/gm
  const matches = [...url.matchAll(regexp)]
  if (!matches) throw new Error(`Invalid URL`)

  const groups = matches[0]

  // page openned in modal
  if (groups[4]) return groups[4]
  else return groups[2]
}

async function _getPageTitle({ pageId, secret }) {
  const notion = _getNotionClient(secret)
  let response = await notion.pages.retrieve({
    page_id: pageId,
    property_id: 'title',
  })

  if (response.properties.title)
    return `Highlights from ${response.properties.title.title
      .map(t => t.plain_text)
      .join('')}`

  response = await notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: 'title',
  })
  const title = response.results[0].title.plain_text
  return `Highlights from ${title}`
}

async function _getAllChildrenBlocksOfPage({ pageId, secret }) {
  let blocks = []
  const notion = _getNotionClient(secret)
  let response = await notion.blocks.children.list({
    block_id: pageId,
  })

  blocks = [...blocks, ...response.results]

  while (response.has_more) {
    response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: response.next_cursor,
    })

    blocks = [...blocks, ...response.results]
  }

  return blocks
}

// detects highlights in the middle of highlights
function _getHighlightsFromBlocks({ pageBlocks }) {
  const highlightedBlocks = []
  let previousBlockId = ''
  let previousBlockWasHighlighted = false

  for (let i = 0; i < pageBlocks.length; i++) {
    const block = pageBlocks[i]
    const nextBlock = pageBlocks[i + 1]

    if (SUPPORTED_BLOCK_TYPES.includes(block.type)) {
      // looping over the block text
      block[block.type].rich_text.map(text => {
        // capture only if the text is annotated
        if (text.annotations.color !== 'default') {
          // group related blocks
          if (previousBlockWasHighlighted && block.id === previousBlockId) {
            highlightedBlocks[highlightedBlocks.length - 1].text +=
              text.plain_text
          } else {
            highlightedBlocks.push({
              text: text.plain_text,
              blockId: block.id,
              groupWithNextBlock:
                BLOCKS_TO_JOIN.includes(block.type) &&
                nextBlock?.type === block?.type,
            })

            previousBlockId = block.id
            previousBlockWasHighlighted = true
          }
        } else {
          previousBlockId = ''
          previousBlockWasHighlighted = false
        }
      })
    }
  }

  return highlightedBlocks
}

const notionService = {
  exportNotesFromNotion: exportNotesFromNotion,
}

module.exports = notionService
