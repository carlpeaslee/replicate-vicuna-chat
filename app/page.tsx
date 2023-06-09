'use client'
import Image from 'next/image'
import {
  DOMAttributes,
  FormEventHandler,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react'
import { ChatEngine } from 'prompt-engine'
import { customAlphabet, urlAlphabet } from 'nanoid'
import useSWR, { Fetcher } from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'

type Conversation = { role: 'user' | 'assistant'; content: string }[]

const getLastRole = (conversation: Conversation | undefined) =>
  conversation?.at(-1)?.role || 'assistant'

const newId = customAlphabet(urlAlphabet, 10)

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('id')

  const newConversation = useCallback(
    () => router.push(`?id=${newId()}`),
    [router]
  )

  useEffect(() => {
    if (!conversationId) {
      newConversation()
    }
  }, [newConversation, conversationId])
  const { data, mutate } = useSWR(`/chat/${conversationId}`, fetcher, {
    refreshInterval: (data) =>
      getLastRole(data?.conversation) === 'assistant' ? 0 : 2000,
  })

  const [content, setContent] = useState('')
  const handleSubmit: DOMAttributes<HTMLFormElement>['onSubmit'] = async (
    e
  ) => {
    e.preventDefault()

    await fetch(`/chat/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: 'user',
        content,
        name: 'User',
      }),
    })
    await mutate()
    setContent('')
  }

  return (
    <main className="w-screen h-screen flex flex-col items-center bg-[#E9E9E2]">
      <div className="w-[640px] flex flex-col grow-0 items-center h-full">
        <div className="mt-12 mb-10 text-center">
          <h1 className="text-4xl m-2 text-black font-semibold">GPT-me</h1>
          <h3 className={'text-lg text-stone-600 font-serif'}>
            By talking to myself, I know I'm talking to an intelligent person.
          </h3>
          <h4 className={'text-lg m-1 text-stone-600 font-serif'}>
            ROBERT FROST
          </h4>
          <button onClick={newConversation}>New Conversation</button>
        </div>
        {/* Chat list */}
        <div className="grow-1 h-full w-full">
          {data?.conversation?.map(({ role, content }, i) => (
            <Message
              key={i}
              content={content}
              role={role}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 h-36 w-screen bg-[#e0e0d3] flex flex-col items-center">
        <div className="w-[640px] py-5 h-full">
          <form
            className="w-full h-full relative"
            onSubmit={handleSubmit}
          >
            <textarea
              placeholder="Write what comes to mind"
              className="w-full h-full absolute z-10 p-3"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
            <div className="w-full h-full p-3 flex justify-end items-center">
              <button className="absolute bg-blue-200 p-2 rounded-md z-20">
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

const Message = ({
  content,
  role,
}: {
  content: string
  role: 'user' | 'assistant'
}) => {
  const bgColor = role === 'user' ? 'bg-white font-bold' : 'bg-stone-100'
  return (
    <div className={`rounded-lg w-full ${bgColor} my-4 p-4`}>
      <div className={`w-full`}>{content}</div>
    </div>
  )
}

const fetcher: Fetcher<{ conversation: Conversation }, string> = (...args) =>
  fetch(...args).then((res) => res.json())
