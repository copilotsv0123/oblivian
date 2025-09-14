// Node 18+ has fetch built-in globally

const API_TOKEN = process.env.MCP_API_TOKEN;
const API_URL = 'http://localhost:3000/api/mcp';

async function testMCP() {
  if (!API_TOKEN) {
    console.error('Please set MCP_API_TOKEN environment variable');
    console.log('You can find your token in the database or create one in the Settings page');
    process.exit(1);
  }

  console.log('Testing MCP endpoint...\n');

  // Test list_cards for specific deck
  const deckId = '011c8f69-4dac-498b-835d-5840d79f62c3';
  console.log(`Testing list_cards for deck ID: ${deckId}...`);

  const cardsResponse = await sendMCPRequest('tools/call', {
    name: 'list_cards',
    arguments: {
      deckId: deckId
    }
  });

  console.log('Raw response:', JSON.stringify(cardsResponse, null, 2));

  const cardsData = JSON.parse(cardsResponse.result.content[0].text);
  console.log(`\nDeck: "${cardsData.deckTitle}"`);
  console.log(`Total cards: ${cardsData.cardCount}`);

  if (cardsData.cards.length > 0) {
    console.log('\nAll cards:');
    console.log('='.repeat(60));
    cardsData.cards.forEach((card, i) => {
      console.log(`\nCard ${i + 1}:`);
      console.log(`  Front: ${card.front}`);
      console.log(`  Back: ${card.back}`);
      if (card.type !== 'basic') {
        console.log(`  Type: ${card.type}`);
      }
      if (card.advanced_notes) {
        console.log(`  Notes: ${card.advanced_notes}`);
      }
    });
  } else {
    console.log('\nNo cards found in this deck.');
  }
}

async function sendMCPRequest(method, params) {
  const requestId = Date.now();
  const request = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    params
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // The response is JSON, not SSE
  const data = await response.json();

  if (data.error) {
    console.error('Full error:', JSON.stringify(data.error, null, 2));
    throw new Error(`MCP Error: ${data.error.message}`);
  }

  return data;
}

testMCP().catch(console.error);