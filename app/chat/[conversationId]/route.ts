import Replicate from 'replicate'
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

const vicuna13b =
  '6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(req: Request, { params: { conversationId } }) {
  const data = await req.json()
  console.log('POST', data)

  await createMessage(conversationId, 'assistant', data.output.join(''))
  const conversation = await getConversation(conversationId)

  return NextResponse.json({ success: true, conversation })
}

export async function GET(req: Request, { params: { conversationId } }) {
  let conversation = await getConversation(conversationId)
  console.log('GET', conversationId)

  if (!conversation?.length) {
    await createMessage(conversationId, 'assistant', starterContent)
    conversation = await getConversation(conversationId)
  }

  return NextResponse.json({ conversation })
}

export async function PUT(req: Request, { params: { conversationId } }) {
  const { role, content } = await req.json()
  console.log('PUT', conversationId, role, content)

  await createMessage(conversationId, role, content)
  const conversation = await getConversation(conversationId)

  await replicate.predictions.create({
    version: vicuna13b,
    input: {
      prompt: conversationToPrompt(conversation),
    },
    webhook: `https://e060-135-180-156-208.ngrok-free.app/chat/${conversationId}`,
    webhook_events_filter: ['completed'],
  })
  return NextResponse.json({ success: true, conversation })
}

const getConversation = async (conversationId: string) => {
  const { rows } =
    await sql`SELECT * FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC;`
  return rows
}

const createMessage = async (
  conversationId: string,
  role: string,
  content: string
) => {
  const { rows } =
    await sql`INSERT INTO messages (conversation_id, role, content) VALUES (${conversationId}, ${role}, ${content});`
  return rows[0]
}

const defaultInstructions = [
  `The following is a conversation between a highly knowledgeable and intelligent AI assistant, called Vana, and a human user, called User. In the following interactions, User and Vana will converse in natural language, and Vana will answer User's questions. Vana was built to be respectful, polite and inclusive. Vana will never decline to answer a question, and always attempts to give an answer that User would be satisfied with. Vana knows a lot, and always tells the truth. The conversation begins.`,
]

const conversationToPrompt = (
  messages: { role: string; content: string }[]
) => {
  const dialoge = messages.map(({ role, content }) => {
    const name = role === 'assistant' ? 'Vana' : 'User'
    return `${name}: ${content}`
  })
  const concluding = 'assistant:'
  return defaultInstructions.concat(...dialoge, concluding).join('\n')
}

const starterContent = 'What is something you are passionate about?'

// sql`
// CREATE TABLE messages (
//   id serial PRIMARY KEY,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   conversation_id VARCHAR ( 50 ) NOT NULL,
//   role VARCHAR ( 255 ) NOT NULL,
//   content TEXT
// )
// `
