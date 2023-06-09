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
  const [inflight, setInflight] = useState(false)
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

  const submit = async () => {
    if (inflight) return
    setInflight(true)
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
    setInflight(false)
  }

  const handleSubmit: DOMAttributes<HTMLFormElement>['onSubmit'] = async (
    e
  ) => {
    e.preventDefault()
    await submit()
  }

  return (
    <main className="w-screen h-screen flex flex-col items-center bg-[#E9E9E2] grow-0">
      <div className="w-[640px] flex flex-col grow-1 items-center h-full pb-36">
        <div className="mt-10 mb-8 text-center">
          <h1 className="text-4xl m-2 text-black font-medium">GPT-me</h1>
          <h3 className={'text-lg text-stone-600 font-serif font-medium'}>
            {`By talking to myself, I know I'm talking to an intelligent person.`}
          </h3>
          <h4 className={'text-md font-semibold m-1 text-stone-600 font-serif'}>
            ROBERT FROST
          </h4>
        </div>
        {/* Chat list */}
        <div className="h-full w-full overflow-scroll">
          {data?.conversation?.map(({ role, content }, i) => (
            <Message
              key={i}
              content={content}
              role={role}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 h-36 w-screen bg-[#e0e0d3] flex flex-col items-center absolute bottom-0">
        <div className="w-[640px] py-5 h-full">
          <form
            className="w-full h-full relative"
            onSubmit={handleSubmit}
          >
            <textarea
              placeholder="Write what comes to mind"
              className="w-full h-full absolute z-10 p-3 pr-24 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && e.metaKey == true) {
                  e.preventDefault()
                  await submit()
                }
              }}
              disabled={inflight}
            />
            <div className="w-full h-full p-3 flex flex-col justify-center items-end  absolute space-y-2">
              <button
                type={'submit'}
                className="bg-blue-200 p-2 rounded-md z-20 w-20"
                disabled={inflight}
              >
                Send
              </button>
              <button
                onClick={newConversation}
                className=" bg-blue-200 p-2 rounded-md z-20 w-20"
                disabled={inflight}
              >
                Refresh
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
  const bgColor = role === 'user' ? 'bg-white font-medium' : 'bg-stone-100'
  return (
    <div className={`w-full my-4  flex`}>
      <div
        className={`h-12 w-12 rounded-full shrink-0 ${bgColor} mr-2 flex justify-center items-center`}
      >
        {role === 'assistant' ? (
          <img
            src={'/bot.svg'}
            className="h-8 w-8"
          />
        ) : (
          <h1 className="text-lg font-semibold">U</h1>
        )}
      </div>
      <div className={`whitespace-pre-wrap rounded-lg w-full ${bgColor} p-4`}>
        {content}
      </div>
    </div>
  )
}

const fetcher: Fetcher<{ conversation: Conversation }, string> = (...args) =>
  fetch(...args).then((res) => res.json())
