/**
 * Cassa Comune State Management
 */

export const state = {
    trip: {
        id: null,
        name: '',
        currency: 'EUR',
        budget: null,
        participants: [],  // Array of { id: string, name: string }
        transactions: []  // Array of { id: string, type: 'expense'|'income', description: string, amount: number, date: string, payerId: string, category: string, splitIds: string[] }
    }
};

// --- TRIP ACTIONS ---

export function initTrip(name, currency, budget = null) {
    state.trip = {
        id: 'trip_' + Date.now(),
        name: name,
        currency: currency,
        budget: budget ? parseFloat(budget) : null,
        participants: [],
        transactions: []
    };
    return state.trip;
}

export function updateTripSettings(name, currency, budget = null) {
    state.trip.name = name;
    state.trip.currency = currency;
    state.trip.budget = budget ? parseFloat(budget) : null;
    return state.trip;
}

export function resetTrip() {
    state.trip = {
        id: null,
        name: '',
        currency: 'EUR',
        budget: null,
        participants: [],
        transactions: []
    };
}

// --- PARTICIPANT ACTIONS ---

export function addParticipant(name) {
    const newParticipant = {
        id: 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name.trim()
    };
    state.trip.participants.push(newParticipant);
    
    // Auto-update splits for existing expenses if wanted, but standard is to keep them.
    return newParticipant;
}

export function deleteParticipant(id) {
    // Remove participant
    state.trip.participants = state.trip.participants.filter(p => p.id !== id);
    
    // Clean up transactions associated
    // 1. Incomes: delete incomes where this participant was the payer
    state.trip.transactions = state.trip.transactions.filter(t => !(t.type === 'income' && t.payerId === id));
    
    // 2. Expenses: 
    // - If they paid: delete the expense or change payer? Better to delete it as it's invalid now.
    // - If they were in splitIds: remove them from splitIds. If splitIds becomes empty, delete the expense.
    state.trip.transactions = state.trip.transactions.filter(t => {
        if (t.type === 'expense') {
            if (t.payerId === id) {
                return false; // delete
            }
            t.splitIds = t.splitIds.filter(sId => sId !== id);
            return t.splitIds.length > 0; // keep only if split list is not empty
        }
        return true;
    });
}

export function renameParticipant(id, newName) {
    const participant = state.trip.participants.find(p => p.id === id);
    if (participant) {
        participant.name = newName.trim();
    }
}

// --- TRANSACTION ACTIONS ---

export function addTransaction({ type, description, amount, date, payerId, category = 'Altro', splitIds = [], originalAmount = null, originalCurrency = null, exchangeRate = null }) {
    const newTransaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type, // 'expense' or 'income'
        description: description.trim(),
        amount: parseFloat(amount),
        date,
        payerId, // participantId or 'cassa_comune' (only for expenses)
        category,
        splitIds: type === 'expense' ? splitIds : [], // only expenses have splits
        originalAmount: originalAmount ? parseFloat(originalAmount) : null,
        originalCurrency: originalCurrency || null,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null
    };
    state.trip.transactions.push(newTransaction);
    // Sort transactions by date descending, then by creation time descending
    sortTransactions();
    return newTransaction;
}

export function deleteTransaction(id) {
    state.trip.transactions = state.trip.transactions.filter(t => t.id !== id);
}

export function getTransaction(id) {
    return state.trip.transactions.find(t => t.id === id);
}

export function updateTransaction(id, updatedFields) {
    const txIndex = state.trip.transactions.findIndex(t => t.id === id);
    if (txIndex !== -1) {
        state.trip.transactions[txIndex] = {
            ...state.trip.transactions[txIndex],
            ...updatedFields,
            amount: updatedFields.amount !== undefined ? parseFloat(updatedFields.amount) : state.trip.transactions[txIndex].amount,
            originalAmount: updatedFields.originalAmount !== undefined ? (updatedFields.originalAmount ? parseFloat(updatedFields.originalAmount) : null) : state.trip.transactions[txIndex].originalAmount,
            originalCurrency: updatedFields.originalCurrency !== undefined ? updatedFields.originalCurrency : state.trip.transactions[txIndex].originalCurrency,
            exchangeRate: updatedFields.exchangeRate !== undefined ? (updatedFields.exchangeRate ? parseFloat(updatedFields.exchangeRate) : null) : state.trip.transactions[txIndex].exchangeRate
        };
        sortTransactions();
        return state.trip.transactions[txIndex];
    }
    return null;
}

function sortTransactions() {
    state.trip.transactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        // If dates are equal, sort by id creation time (newest first)
        return b.id.localeCompare(a.id);
    });
}

// --- CALCULATION ENGINE ---

/**
 * Calculates current cassa comune stats
 */
export function getPotStats() {
    let totalContributions = 0;
    let totalPotExpenses = 0;

    state.trip.transactions.forEach(t => {
        if (t.type === 'income') {
            totalContributions += t.amount;
        } else if (t.type === 'expense' && t.payerId === 'cassa_comune') {
            totalPotExpenses += t.amount;
        }
    });

    return {
        totalContributions,
        totalPotExpenses,
        balance: totalContributions - totalPotExpenses // Current cash in the pot
    };
}

/**
 * Calculates total overall spending of the trip (excluding contributions since they are not expenses,
 * and including both out-of-pocket and pot expenses)
 */
export function getTotalSpent() {
    return state.trip.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculates detailed statistics for each participant
 */
export function getParticipantBalances() {
    const balances = {};

    // Initialize all participants
    state.trip.participants.forEach(p => {
        balances[p.id] = {
            id: p.id,
            name: p.name,
            paidOutOfPocket: 0,
            contributedToPot: 0,
            owedAmount: 0,
            netBalance: 0
        };
    });

    // Process transactions
    state.trip.transactions.forEach(t => {
        if (t.type === 'income') {
            // Money contributed to the pot
            if (balances[t.payerId]) {
                balances[t.payerId].contributedToPot += t.amount;
            }
        } else if (t.type === 'expense') {
            // 1. Add to the paid amount of the payer
            if (t.payerId !== 'cassa_comune' && balances[t.payerId]) {
                balances[t.payerId].paidOutOfPocket += t.amount;
            }

            // 2. Add share owed by split participants
            if (t.splitIds && t.splitIds.length > 0) {
                const share = t.amount / t.splitIds.length;
                t.splitIds.forEach(pId => {
                    if (balances[pId]) {
                        balances[pId].owedAmount += share;
                    }
                });
            }
        }
    });

    // Calculate final Net Balance for each person:
    // Net = (Paid Out of Pocket + Contributed to Pot) - Owed Amount
    state.trip.participants.forEach(p => {
        const b = balances[p.id];
        b.netBalance = (b.paidOutOfPocket + b.contributedToPot) - b.owedAmount;
    });

    return balances;
}

// --- DEBT SETTLEMENT OPTIMIZER ---

/**
 * Calculates the optimized list of transfers to settle all debts.
 * Includes the Common Pot as a virtual participant if it has a non-zero balance!
 */
export function calculateTransfers() {
    const balances = getParticipantBalances();
    const potStats = getPotStats();
    
    // List of active participants with their net balances
    const activeBalances = Object.values(balances).map(b => ({
        id: b.id,
        name: b.name,
        type: 'participant',
        net: b.netBalance
    }));

    // If the pot has active cash (contributions > expenses), it represents a liability/creditor.
    // The pot has cash, meaning it holds money that needs to be distributed.
    // Its net balance in the settlement sheet is -potStats.balance (since it must give away its cash).
    // Sum(participant balances) = pot balance.
    // Thus: Sum(participant balances) + (-pot balance) = 0.
    if (Math.abs(potStats.balance) > 0.009) {
        activeBalances.push({
            id: 'cassa_comune',
            name: 'Cassa Comune (Resto)',
            type: 'pot',
            net: -potStats.balance // Negative net balance means it has excess cash that it owes to creditors
        });
    }

    const creditors = [];
    const debtors = [];

    activeBalances.forEach(item => {
        // Use threshold to avoid floating point precision issues
        if (item.net > 0.009) {
            creditors.push({ ...item });
        } else if (item.net < -0.009) {
            debtors.push({ ...item, net: Math.abs(item.net) }); // Store absolute value for convenience
        }
    });

    // Sort creditors descending, debtors descending
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => b.net - a.net);

    const transfers = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
        const creditor = creditors[cIdx];
        const debtor = debtors[dIdx];

        const amountToTransfer = Math.min(creditor.net, debtor.net);

        if (amountToTransfer > 0.009) {
            transfers.push({
                from: {
                    id: debtor.id,
                    name: debtor.name,
                    type: debtor.type
                },
                to: {
                    id: creditor.id,
                    name: creditor.name,
                    type: creditor.type
                },
                amount: amountToTransfer
            });
        }

        creditor.net -= amountToTransfer;
        debtor.net -= amountToTransfer;

        if (creditor.net <= 0.009) {
            cIdx++;
        }
        if (debtor.net <= 0.009) {
            dIdx++;
        }
    }

    return transfers;
}

// --- UTILITIES ---

/**
 * Gets spending divided by category
 */
export function getCategorySpending() {
    const categories = {
        'Cibo': 0,
        'Alloggio': 0,
        'Trasporti': 0,
        'Svago': 0,
        'Altro': 0
    };

    state.trip.transactions.forEach(t => {
        if (t.type === 'expense') {
            const cat = t.category || 'Altro';
            if (categories[cat] !== undefined) {
                categories[cat] += t.amount;
            } else {
                categories['Altro'] += t.amount;
            }
        }
    });

    return categories;
}
