import transactionsData from '../../firebase_export/transactions.json'
import { getSaldosIniciales } from './dbSettings'
import { load, save } from './storage'

let transactions = load('ada_transactions', transactionsData)

export function getTransactions() {
  return transactions
}

export function addTransaction(tx) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newTx = { id, ...tx }
  transactions = [newTx, ...transactions]
  save('ada_transactions', transactions)
  return newTx
}

export function updateTransaction(id, data) {
  transactions = transactions.map((tx) =>
    tx.id === id ? { ...tx, ...data } : tx
  )
  save('ada_transactions', transactions)
  return transactions.find((tx) => tx.id === id)
}

export function deleteTransaction(id) {
  transactions = transactions.filter((tx) => tx.id !== id)
  save('ada_transactions', transactions)
}

export function getAccountBalances() {
  const saldos = getSaldosIniciales()
  const balances = {
    banco: saldos.banco,
    efectivo: saldos.efectivo,
    nequi: saldos.nequi,
  }

  for (const tx of transactions) {
    if (!balances.hasOwnProperty(tx.account)) continue
    if (tx.type === 'ingreso') {
      balances[tx.account] += tx.amount
    } else {
      balances[tx.account] -= tx.amount
    }
  }

  return balances
}
