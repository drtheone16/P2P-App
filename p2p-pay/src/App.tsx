import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

// Models
export type User = {
  id: string
  name: string
  handle: string
  avatarUrl: string
  balanceCents: number
}

export type Transaction = {
  id: string
  fromUserId: string
  toUserId: string
  amountCents: number
  note?: string
  createdAt: string
}

// Mock data
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Johnson', handle: 'alex', avatarUrl: 'https://i.pravatar.cc/100?img=1', balanceCents: 125_00 },
  { id: 'u2', name: 'Sam Lee', handle: 'sam', avatarUrl: 'https://i.pravatar.cc/100?img=2', balanceCents: 86_50 },
  { id: 'u3', name: 'Priya Patel', handle: 'priya', avatarUrl: 'https://i.pravatar.cc/100?img=3', balanceCents: 203_75 },
  { id: 'u4', name: 'Diego Martinez', handle: 'diego', avatarUrl: 'https://i.pravatar.cc/100?img=4', balanceCents: 45_25 },
]

const LOCAL_STORAGE_KEY = 'p2p-pay-state-v1'

function formatCents(amountCents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amountCents / 100)
}

function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : initial
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])
  return [state, setState] as const
}

function createInitialState() {
  const now = new Date().toISOString()
  const initialTransactions: Transaction[] = [
    { id: 't1', fromUserId: 'u2', toUserId: 'u1', amountCents: 1250, note: 'Lunch', createdAt: now },
    { id: 't2', fromUserId: 'u1', toUserId: 'u3', amountCents: 2200, note: 'Tickets', createdAt: now },
    { id: 't3', fromUserId: 'u4', toUserId: 'u1', amountCents: 500, note: 'Coffee', createdAt: now },
  ]
  return { users: MOCK_USERS, transactions: initialTransactions, currentUserId: 'u1' }
}

function App() {
  const [state, setState] = useLocalState(LOCAL_STORAGE_KEY, createInitialState())

  const currentUser = useMemo(() => state.users.find(u => u.id === state.currentUserId)!, [state])
  const contacts = useMemo(() => state.users.filter(u => u.id !== state.currentUserId), [state])
  const [selectedToUserId, setSelectedToUserId] = useState<string>(contacts[0]?.id ?? '')
  useEffect(() => {
    // Ensure selected recipient is valid when contacts change
    if (!contacts.find(c => c.id === selectedToUserId)) {
      setSelectedToUserId(contacts[0]?.id ?? '')
    }
  }, [contacts, selectedToUserId])

  function sendMoney(toUserId: string, amountCents: number, note?: string) {
    setState(prev => {
      const fromUserIdx = prev.users.findIndex(u => u.id === prev.currentUserId)
      const toUserIdx = prev.users.findIndex(u => u.id === toUserId)
      if (fromUserIdx === -1 || toUserIdx === -1) return prev
      const fromUser = prev.users[fromUserIdx]
      if (amountCents <= 0 || amountCents > fromUser.balanceCents) return prev

      const updatedUsers = [...prev.users]
      updatedUsers[fromUserIdx] = { ...fromUser, balanceCents: fromUser.balanceCents - amountCents }
      updatedUsers[toUserIdx] = { ...updatedUsers[toUserIdx], balanceCents: updatedUsers[toUserIdx].balanceCents + amountCents }

      const newTx: Transaction = {
        id: 't' + Math.random().toString(36).slice(2, 9),
        fromUserId: prev.currentUserId,
        toUserId,
        amountCents,
        note,
        createdAt: new Date().toISOString(),
      }

      return { ...prev, users: updatedUsers, transactions: [newTx, ...prev.transactions] }
    })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">$</div>
            <div>
              <div className="text-sm text-gray-500">Welcome</div>
              <div className="font-semibold">{currentUser.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary" onClick={() => setState(createInitialState())}>Reset Demo</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
                      <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Balance</h2>
                <div className="text-2xl font-bold">{formatCents(currentUser.balanceCents)}</div>
              </div>
              <SendMoney contacts={contacts} selectedToUserId={selectedToUserId} onChangeTo={setSelectedToUserId} onSend={sendMoney} />
            </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <TransactionList transactions={state.transactions} users={state.users} currentUserId={state.currentUserId} />
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold mb-4">Contacts</h2>
            <ContactList contacts={contacts} onSelect={setSelectedToUserId} />
          </div>
        </aside>
      </main>
    </div>
  )
}

function ContactList({ contacts, onSelect }: { contacts: User[]; onSelect: (id: string) => void }) {
  return (
    <ul className="divide-y divide-gray-100">
      {contacts.map((c) => (
        <li key={c.id} className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src={c.avatarUrl} alt={c.name} className="h-9 w-9 rounded-full ring-2 ring-white object-cover" />
            <div className="min-w-0">
              <div className="truncate font-medium">{c.name}</div>
              <div className="text-xs text-gray-500 truncate">@{c.handle}</div>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => onSelect(c.id)}>Send</button>
        </li>
      ))}
    </ul>
  )
}

function SendMoney({ contacts, selectedToUserId, onChangeTo, onSend }: { contacts: User[]; selectedToUserId: string; onChangeTo: (id: string) => void; onSend: (toUserId: string, amountCents: number, note?: string) => void }) {
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState<string>('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount || '0') * 100)
    if (!selectedToUserId || isNaN(cents) || cents <= 0) return
    onSend(selectedToUserId, cents, note || undefined)
    setAmount('')
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="label">To</label>
        <select className="input" value={selectedToUserId} onChange={(e) => onChangeTo(e.target.value)}>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>{c.name} (@{c.handle})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Amount</label>
        <input className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <label className="label">Note</label>
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="What is this for?" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary" type="submit">Send</button>
        </div>
      </div>
    </form>
  )
}

function TransactionList({ transactions, users, currentUserId }: { transactions: Transaction[]; users: User[]; currentUserId: string }) {
  const byId = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users])
  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((t) => {
        const from = byId[t.fromUserId]
        const to = byId[t.toUserId]
        const isOutgoing = t.fromUserId === currentUserId
        return (
          <li key={t.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={(isOutgoing ? to : from).avatarUrl} className="h-8 w-8 rounded-full object-cover" />
              <div>
                <div className="text-sm">
                  {isOutgoing ? 'You paid ' : 'You were paid by '}
                  <span className="font-medium">{isOutgoing ? to.name : from.name}</span>
                  {t.note ? <span className="text-gray-500"> • {t.note}</span> : null}
                </div>
                <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className={`text-sm font-semibold ${isOutgoing ? 'text-red-600' : 'text-green-600'}`}>
              {isOutgoing ? '-' : '+'}{formatCents(t.amountCents)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default App
