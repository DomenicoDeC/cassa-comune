/**
 * Cassa Comune UI Controller
 */

import { 
    state, 
    initTrip, 
    updateTripSettings, 
    resetTrip,
    addParticipant, 
    deleteParticipant,
    addTransaction, 
    deleteTransaction, 
    updateTransaction,
    getPotStats, 
    getTotalSpent, 
    getParticipantBalances, 
    calculateTransfers, 
    getCategorySpending,
    getTransaction
} from './state.js';

import { saveTripToStorage, clearTripStorage, exportTripAsJSON, importTripFromJSON } from './storage.js';
import { renderCategoryChart } from './charts.js';
import { uploadTripToCloud, downloadTripFromCloud, generateInviteLink, generateQRCodeUrl, getJoinIdFromUrl, saveBlobId } from './sync.js';

// --- CURRENCY UTILS ---
const CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'CHF': 'CHF'
};

export function formatCurrency(amount) {
    const symbol = CURRENCY_SYMBOLS[state.trip.currency] || '€';
    // Clean, localized format
    return new Intl.NumberFormat('it-IT', { 
        style: 'currency', 
        currency: state.trip.currency,
        currencyDisplay: 'symbol'
    }).format(amount);
}

// --- TOAST NOTIFICATIONS ---
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-info-circle"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-check-circle"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-exclamation-circle"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- DOM ELEMENTS CACHE ---
const elements = {
    welcomeScreen: document.getElementById('welcome-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Welcome Buttons
    btnNewTrip: document.getElementById('btn-new-trip'),
    btnImportTrip: document.getElementById('btn-import-trip'),
    
    // Header Info
    tripTitleDisplay: document.getElementById('trip-title-display'),
    tripDatesDisplay: document.getElementById('trip-dates-display'),
    btnTripSettings: document.getElementById('btn-trip-settings'),
    btnExport: document.getElementById('btn-export'),
    btnCloseTrip: document.getElementById('btn-close-trip'),
    btnShareTrip: document.getElementById('btn-share-trip'),
    
    // Nav Items
    navItems: document.querySelectorAll('.bottom-nav .nav-item'),
    sections: document.querySelectorAll('.content-section'),
    
    // Modals
    modalTrip: document.getElementById('modal-trip'),
    modalParticipant: document.getElementById('modal-participant'),
    modalExpense: document.getElementById('modal-expense'),
    modalIncome: document.getElementById('modal-income'),
    modalImport: document.getElementById('modal-import'),
    modalShare: document.getElementById('modal-share'),
    
    // Forms
    formTrip: document.getElementById('form-trip'),
    formParticipant: document.getElementById('form-participant'),
    formExpense: document.getElementById('form-expense'),
    formIncome: document.getElementById('form-income'),
    formImport: document.getElementById('form-import'),
    
    // Form Inputs
    tripIdInput: document.getElementById('trip-id'),
    tripNameInput: document.getElementById('trip-name'),
    tripCurrencySelect: document.getElementById('trip-currency'),
    tripBudgetInput: document.getElementById('trip-budget'),
    
    participantNameInput: document.getElementById('participant-name'),
    
    expenseIdInput: document.getElementById('expense-id'),
    expenseDescInput: document.getElementById('expense-description'),
    expenseCategorySelect: document.getElementById('expense-category'),
    expenseAmountInput: document.getElementById('expense-amount'),
    expenseCurrencySelect: document.getElementById('expense-currency'),
    expenseExchangeRateRow: document.getElementById('exchange-rate-row'),
    expenseExchangeRateInput: document.getElementById('expense-exchange-rate'),
    exchangeRatePreview: document.getElementById('exchange-rate-preview'),
    expenseAmountCurrencyLabel: document.getElementById('expense-amount-currency-label'),
    expenseDateInput: document.getElementById('expense-date'),
    expensePayerSelect: document.getElementById('expense-payer'),
    expenseSplitsList: document.getElementById('expense-splits-list'),
    btnSplitAll: document.getElementById('btn-split-all'),
    btnSplitNone: document.getElementById('btn-split-none'),

    // OCR Elements
    ocrDropZone: document.getElementById('ocr-drop-zone'),
    ocrFileInput: document.getElementById('ocr-file-input'),
    ocrLoadingOverlay: document.getElementById('ocr-loading'),
    ocrProgressText: document.getElementById('ocr-progress-text'),
    
    incomeIdInput: document.getElementById('income-id'),
    incomePayerSelect: document.getElementById('income-payer'),
    incomeAmountInput: document.getElementById('income-amount'),
    incomeAmountCurrencyLabel: document.getElementById('income-amount-currency-label'),
    incomeDateInput: document.getElementById('income-date'),
    
    importFileInput: document.getElementById('import-file-input'),
    dropZone: document.getElementById('drop-zone'),
    importFilename: document.getElementById('import-filename'),
    btnConfirmImport: document.getElementById('btn-confirm-import'),
    
    // Dashboard Stats
    statTotalSpent: document.getElementById('stat-total-spent'),
    statPotBalance: document.getElementById('stat-pot-balance'),
    statPotTotalContrib: document.getElementById('stat-pot-total-contrib'),
    statParticipantsCount: document.getElementById('stat-participants-count'),
    statAvgSpent: document.getElementById('stat-avg-spent'),
    miniTransactionsList: document.getElementById('mini-transactions-list'),
    btnViewAllTransactions: document.getElementById('btn-view-all-transactions'),
    
    // Transactions View
    btnMainAddExpense: document.getElementById('btn-add-expense'),
    btnMainAddIncome: document.getElementById('btn-add-income'),
    searchTxInput: document.getElementById('search-transaction'),
    filterTxType: document.getElementById('filter-type'),
    filterTxCategory: document.getElementById('filter-category'),
    mainTransactionsList: document.getElementById('main-transactions-list'),
    
    // Participants View
    btnMainAddParticipant: document.getElementById('btn-add-participant'),
    participantsList: document.getElementById('participants-list'),
    
    // Settlement View
    balancesList: document.getElementById('balances-list'),
    transfersList: document.getElementById('transfers-list')
};

// --- VIEW NAVIGATION ---
function switchTab(targetSectionId) {
    // Update nav active classes
    elements.navItems.forEach(item => {
        if (item.getAttribute('data-target') === targetSectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update section active classes
    elements.sections.forEach(section => {
        if (section.id === targetSectionId) {
            section.classList.add('active');
            section.style.display = 'flex';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });

    // Render components corresponding to the active view
    refreshActiveView(targetSectionId);
}

function refreshActiveView(viewId) {
    if (viewId === 'view-dashboard') {
        renderDashboardView();
    } else if (viewId === 'view-transactions') {
        renderTransactionsView();
    } else if (viewId === 'view-participants') {
        renderParticipantsView();
    } else if (viewId === 'view-settlement') {
        renderSettlementView();
    }
}

export function refreshAllViews() {
    if (!state.trip.id) {
        elements.welcomeScreen.classList.add('active');
        elements.mainScreen.classList.remove('active');
    } else {
        elements.welcomeScreen.classList.remove('active');
        elements.mainScreen.classList.add('active');
        
        // Header titles
        elements.tripTitleDisplay.textContent = state.trip.name;
        const budgetText = state.trip.budget ? ` | Budget: ${formatCurrency(state.trip.budget)}` : '';
        elements.tripDatesDisplay.textContent = `${state.trip.participants.length} Partecipanti${budgetText}`;

        // Refresh currently active tab
        const activeNav = document.querySelector('.bottom-nav .nav-item.active');
        if (activeNav) {
            refreshActiveView(activeNav.getAttribute('data-target'));
        } else {
            switchTab('view-dashboard');
        }
    }
}

// --- MODAL UTILS ---
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        closeModal(modal);
    });
}

// --- VIEW RENDERING ENGINE ---

// 1. DASHBOARD VIEW
function renderDashboardView() {
    const totalSpent = getTotalSpent();
    const pot = getPotStats();
    const count = state.trip.participants.length;
    const avg = count > 0 ? totalSpent / count : 0;

    // Set numbers
    elements.statTotalSpent.textContent = formatCurrency(totalSpent);
    elements.statPotBalance.textContent = formatCurrency(pot.balance);
    elements.statPotTotalContrib.textContent = `Tot. Contributi: ${formatCurrency(pot.totalContributions)}`;
    elements.statParticipantsCount.textContent = count;
    elements.statAvgSpent.textContent = `Quota Media: ${formatCurrency(avg)} / persona`;

    // Render visual categories chart
    const catSpending = getCategorySpending();
    renderCategoryChart('chart-categories', catSpending);

    // List recent transactions (first 5)
    elements.miniTransactionsList.innerHTML = '';
    const recent = state.trip.transactions.slice(0, 5);

    if (recent.length === 0) {
        elements.miniTransactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>Nessuna transazione registrata.</p>
            </div>
        `;
    } else {
        recent.forEach(tx => {
            elements.miniTransactionsList.appendChild(createTransactionDOMRow(tx, true));
        });
    }
}

// Helper to render transaction item
function createTransactionDOMRow(tx, isMini = false) {
    const row = document.createElement('div');
    row.className = 'transaction-item';
    
    // Category icon details
    const catIcons = {
        'Cibo': '🍔',
        'Alloggio': '🏨',
        'Trasporti': '🚗',
        'Svago': '🎭',
        'Altro': '📦'
    };
    
    const iconStr = tx.type === 'income' ? '💰' : (catIcons[tx.category] || '📦');
    const badgeClass = tx.type === 'income' ? 'badge-Income' : `badge-${tx.category}`;

    // Date formatting
    const formattedDate = new Date(tx.date).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short'
    });

    // Payer text
    let payerText = '';
    if (tx.type === 'income') {
        const payer = state.trip.participants.find(p => p.id === tx.payerId);
        payerText = `da ${payer ? payer.name : 'Sconosciuto'}`;
    } else {
        if (tx.payerId === 'cassa_comune') {
            payerText = 'da Cassa Comune';
        } else {
            const payer = state.trip.participants.find(p => p.id === tx.payerId);
            payerText = `da ${payer ? payer.name : 'Sconosciuto'}`;
        }
    }

    // Split list text
    let splitSubText = '';
    if (tx.type === 'expense') {
        const splitCount = tx.splitIds ? tx.splitIds.length : 0;
        if (splitCount === state.trip.participants.length) {
            splitSubText = ' • Diviso equamente';
        } else {
            splitSubText = ` • Diviso tra ${splitCount} persone`;
        }
    }

    // Currency Formatting for Multi-Currency displays
    let amountText = formatCurrency(tx.amount);
    let origCurrencyDetails = '';
    if (tx.type === 'expense' && tx.originalCurrency && tx.originalCurrency !== state.trip.currency) {
        origCurrencyDetails = `<span class="sub-text d-block" style="font-size: 0.75rem; font-weight: normal; margin-top: 0.15rem;">(${tx.originalAmount.toFixed(2)} ${tx.originalCurrency})</span>`;
    }

    row.innerHTML = `
        <div class="transaction-left">
            <div class="category-badge ${badgeClass}">${iconStr}</div>
            <div class="transaction-info">
                <span class="transaction-desc">${tx.description || (tx.type === 'income' ? 'Versamento' : 'Spesa')}</span>
                <span class="transaction-meta">${formattedDate} • Pagato ${payerText}${splitSubText}</span>
            </div>
        </div>
        <div class="transaction-right">
            <div>
                <span class="transaction-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}">
                    ${tx.type === 'income' ? '+' : ''}${amountText}
                </span>
                ${origCurrencyDetails}
            </div>
            ${!isMini ? `
            <div class="transaction-actions" style="margin-left: 1rem;">
                <button class="btn-icon btn-sm btn-edit-tx" data-id="${tx.id}" title="Modifica"><i class="fa-solid fa-edit"></i></button>
                <button class="btn-icon btn-sm btn-delete-tx text-danger" data-id="${tx.id}" title="Elimina"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            ` : ''}
        </div>
    `;

    if (!isMini) {
        // Edit button listener
        row.querySelector('.btn-edit-tx').addEventListener('click', () => {
            setupEditTransactionModal(tx.id);
        });

        // Delete button listener
        row.querySelector('.btn-delete-tx').addEventListener('click', () => {
            if (confirm(`Sei sicuro di voler eliminare la transazione "${tx.description}"?`)) {
                deleteTransaction(tx.id);
                saveTripToStorage();
                showToast("Transazione eliminata", "info");
                refreshAllViews();
            }
        });
    }

    return row;
}

// 2. TRANSACTIONS VIEW
function renderTransactionsView() {
    elements.mainTransactionsList.innerHTML = '';
    
    // Apply filters
    const searchVal = elements.searchTxInput.value.toLowerCase();
    const filterType = elements.filterTxType.value;
    const filterCategory = elements.filterTxCategory.value;

    const filtered = state.trip.transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchVal);
        const matchesType = filterType === 'all' || tx.type === filterType;
        const matchesCategory = filterCategory === 'all' || (tx.type === 'expense' && tx.category === filterCategory);
        return matchesSearch && matchesType && matchesCategory;
    });

    if (filtered.length === 0) {
        elements.mainTransactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-search"></i>
                <p>Nessuna transazione corrispondente ai filtri impostati.</p>
            </div>
        `;
    } else {
        filtered.forEach(tx => {
            elements.mainTransactionsList.appendChild(createTransactionDOMRow(tx, false));
        });
    }
}

// 3. PARTICIPANTS VIEW
function renderParticipantsView() {
    elements.participantsList.innerHTML = '';
    const balances = getParticipantBalances();

    if (state.trip.participants.length === 0) {
        elements.participantsList.innerHTML = `
            <div class="empty-state col-span-all">
                <i class="fa-solid fa-users-slash"></i>
                <p>Nessun partecipante. Aggiungine uno per iniziare.</p>
            </div>
        `;
        return;
    }

    state.trip.participants.forEach(p => {
        const pBal = balances[p.id] || { paidOutOfPocket: 0, contributedToPot: 0, owedAmount: 0, netBalance: 0 };
        
        const card = document.createElement('div');
        let cardClass = 'participant-card glass';
        let balanceClass = 'balance-badge balance-neutral';
        let balanceSign = '';

        if (pBal.netBalance > 0.009) {
            cardClass += ' has-positive-balance';
            balanceClass = 'balance-badge balance-creditor';
            balanceSign = '+';
        } else if (pBal.netBalance < -0.009) {
            cardClass += ' has-negative-balance';
            balanceClass = 'balance-badge balance-debtor';
        }
        
        card.className = cardClass;
        
        // Initial of name for avatar
        const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';

        card.innerHTML = `
            <div class="participant-header">
                <div class="participant-info">
                    <div class="avatar">${initial}</div>
                    <span class="participant-name">${p.name}</span>
                </div>
                <div class="header-right">
                    <button class="btn-icon btn-sm btn-rename-participant" data-id="${p.id}" title="Rinomina"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-sm btn-delete-participant text-danger" data-id="${p.id}" title="Elimina"><i class="fa-solid fa-user-xmark"></i></button>
                </div>
            </div>
            
            <div class="participant-details">
                <div class="detail-item">
                    <span class="detail-label">Spese Personali</span>
                    <span class="detail-value text-info">${formatCurrency(pBal.paidOutOfPocket)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Versato in Pot</span>
                    <span class="detail-value text-success">${formatCurrency(pBal.contributedToPot)}</span>
                </div>
                <div class="detail-item mt-3">
                    <span class="detail-label">Totale Pagato</span>
                    <span class="detail-value">${formatCurrency(pBal.paidOutOfPocket + pBal.contributedToPot)}</span>
                </div>
                <div class="detail-item mt-3">
                    <span class="detail-label">Quota Dovuta</span>
                    <span class="detail-value text-danger">${formatCurrency(pBal.owedAmount)}</span>
                </div>
            </div>
            
            <div class="participant-balance-row">
                <span class="sub-text">Stato Saldo:</span>
                <span class="${balanceClass}">${balanceSign}${formatCurrency(pBal.netBalance)}</span>
            </div>
        `;

        // Rename listener
        card.querySelector('.btn-rename-participant').addEventListener('click', () => {
            const newName = prompt(`Modifica il nome di "${p.name}":`, p.name);
            if (newName && newName.trim() !== '') {
                p.name = newName.trim();
                saveTripToStorage();
                showToast("Partecipante rinominato", "success");
                refreshAllViews();
            }
        });

        // Delete listener
        card.querySelector('.btn-delete-participant').addEventListener('click', () => {
            if (confirm(`Sei sicuro di voler eliminare ${p.name}? Le transazioni associate verranno ricalcolate o eliminate.`)) {
                deleteParticipant(p.id);
                saveTripToStorage();
                showToast(`Partecipante "${p.name}" rimosso`, "info");
                refreshAllViews();
            }
        });

        elements.participantsList.appendChild(card);
    });
}

// 4. SETTLEMENT VIEW
function renderSettlementView() {
    elements.balancesList.innerHTML = '';
    elements.transfersList.innerHTML = '';

    const balances = getParticipantBalances();
    const transfers = calculateTransfers();
    const pot = getPotStats();

    // 4.1 Render Individual Balances List
    if (state.trip.participants.length === 0) {
        elements.balancesList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-users-slash"></i>
                <p>Nessun partecipante registrato.</p>
            </div>
        `;
    } else {
        state.trip.participants.forEach(p => {
            const b = balances[p.id] || { netBalance: 0 };
            const div = document.createElement('div');
            div.className = 'balance-item';
            
            let statusText = 'In pari';
            let statusClass = 'text-info';
            let amountText = formatCurrency(0);

            if (b.netBalance > 0.009) {
                statusText = 'Deve ricevere';
                statusClass = 'text-success';
                amountText = `+${formatCurrency(b.netBalance)}`;
            } else if (b.netBalance < -0.009) {
                statusText = 'Deve dare';
                statusClass = 'text-danger';
                amountText = formatCurrency(Math.abs(b.netBalance));
            }

            div.innerHTML = `
                <div class="balance-left">
                    <span class="font-bold d-block">${p.name}</span>
                    <span class="sub-text ${statusClass}">${statusText}</span>
                </div>
                <div class="balance-right font-bold text-lg">
                    <span class="${statusClass}">${amountText}</span>
                </div>
            `;
            elements.balancesList.appendChild(div);
        });

        // Add the Pot remaining balance if any
        if (Math.abs(pot.balance) > 0.009) {
            const div = document.createElement('div');
            div.className = 'balance-item';
            div.innerHTML = `
                <div class="balance-left">
                    <span class="font-bold d-block">Restante Cassa Comune</span>
                    <span class="sub-text text-success">Denaro contante inutilizzato</span>
                </div>
                <div class="balance-right font-bold text-lg text-success">
                    <span>${formatCurrency(pot.balance)}</span>
                </div>
            `;
            elements.balancesList.appendChild(div);
        }
    }

    // 4.2 Render Transfers
    if (transfers.length === 0) {
        elements.transfersList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-check text-success"></i>
                <p>Nessun debito da compensare. Siete tutti in pari!</p>
            </div>
        `;
    } else {
        transfers.forEach(t => {
            const div = document.createElement('div');
            div.className = 'transfer-item';

            let actionText = '';
            let payerName = t.from.name;
            let payeeName = t.to.name;

            if (t.from.id === 'cassa_comune') {
                actionText = `Preleva <strong>${formatCurrency(t.amount)}</strong> dalla <strong>Cassa Comune</strong> e restituiscili a <strong>${payeeName}</strong>.`;
            } else if (t.to.id === 'cassa_comune') {
                // Potentially a payment to the pot
                actionText = `<strong>${payerName}</strong> deve versare <strong>${formatCurrency(t.amount)}</strong> nella <strong>Cassa Comune</strong>.`;
            } else {
                actionText = `<strong>${payerName}</strong> deve pagare <strong>${formatCurrency(t.amount)}</strong> a <strong>${payeeName}</strong>.`;
            }

            div.innerHTML = `
                <div class="transfer-main">
                    <div class="transfer-path">
                        <span class="transfer-person">${payerName}</span>
                        <span class="transfer-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                        <span class="transfer-person">${payeeName}</span>
                    </div>
                    <span class="transfer-amount">${formatCurrency(t.amount)}</span>
                </div>
                <p class="sub-text mt-1 text-primary-hover">${actionText}</p>
            `;
            elements.transfersList.appendChild(div);
        });
    }
}

// --- POPULATE DROPDOWNS & CHECKBOX SPLITS ---
function populatePayerDropdowns() {
    // Clear
    elements.expensePayerSelect.innerHTML = '';
    elements.incomePayerSelect.innerHTML = '';

    if (state.trip.participants.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aggiungi prima i partecipanti';
        elements.expensePayerSelect.appendChild(option.cloneNode(true));
        elements.incomePayerSelect.appendChild(option.cloneNode(true));
        return;
    }

    // Payer Select Expense:
    // Can be paid by any participant, or by "Cassa Comune"
    const potOpt = document.createElement('option');
    potOpt.value = 'cassa_comune';
    potOpt.textContent = '🏦 Cassa Comune';
    elements.expensePayerSelect.appendChild(potOpt);

    state.trip.participants.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `👤 ${p.name}`;
        
        elements.expensePayerSelect.appendChild(opt.cloneNode(true));
        elements.incomePayerSelect.appendChild(opt.cloneNode(true));
    });
}

function populateSplitsList(checkedIds = []) {
    elements.expenseSplitsList.innerHTML = '';
    
    if (state.trip.participants.length === 0) {
        elements.expenseSplitsList.innerHTML = '<span class="sub-text p-2">Nessun partecipante disponibile</span>';
        return;
    }

    state.trip.participants.forEach(p => {
        const div = document.createElement('div');
        div.className = 'split-item';
        
        const isChecked = checkedIds.length === 0 || checkedIds.includes(p.id);
        
        div.innerHTML = `
            <input type="checkbox" id="split-user-${p.id}" value="${p.id}" ${isChecked ? 'checked' : ''}>
            <label for="split-user-${p.id}">${p.name}</label>
        `;
        
        // Clicking the row toggles the checkbox
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = div.querySelector('input');
                cb.checked = !cb.checked;
            }
        });
        
        elements.expenseSplitsList.appendChild(div);
    });
}

// --- CURRENCY & EXCHANGE RATES EVENT HANDLERS ---
async function fetchOnlineExchangeRate(fromCurrency, toCurrency) {
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${toCurrency}`);
        if (!response.ok) throw new Error("Errore di rete");
        const data = await response.json();
        if (data && data.result === 'success' && data.rates && data.rates[fromCurrency]) {
            // 1 fromCurrency = (1 / rates[fromCurrency]) toCurrency
            return 1 / data.rates[fromCurrency];
        }
        throw new Error("Formato tassi non valido");
    } catch (e) {
        console.error("Error fetching exchange rate:", e);
        throw e;
    }
}

async function handleExpenseCurrencyChange() {
    const selectedCurrency = elements.expenseCurrencySelect.value;
    const baseCurrency = state.trip.currency;
    
    // Set currency label next to amount input
    elements.expenseAmountCurrencyLabel.textContent = selectedCurrency;

    if (selectedCurrency !== baseCurrency) {
        elements.expenseExchangeRateRow.style.display = 'flex';
        
        // Temporarily disable while fetching online rate
        elements.expenseExchangeRateInput.disabled = true;
        elements.expenseExchangeRateInput.placeholder = "Caricamento tasso online...";
        elements.exchangeRatePreview.textContent = "Recupero tasso di cambio online...";

        try {
            const onlineRate = await fetchOnlineExchangeRate(selectedCurrency, baseCurrency);
            elements.expenseExchangeRateInput.value = onlineRate.toFixed(4);
            showToast(`Tasso caricato online: 1 ${selectedCurrency} = ${onlineRate.toFixed(4)} ${baseCurrency}`, "success");
        } catch (error) {
            showToast("Impossibile caricare il tasso online. Inseriscilo manualmente.", "error");
            if (!elements.expenseExchangeRateInput.value) {
                elements.expenseExchangeRateInput.value = '1.0000';
            }
        } finally {
            elements.expenseExchangeRateInput.disabled = false;
            elements.expenseExchangeRateInput.placeholder = "Es. 0.9200";
            updateExchangeRatePreview();
        }
    } else {
        elements.expenseExchangeRateRow.style.display = 'none';
        elements.expenseExchangeRateInput.value = '';
        updateExchangeRatePreview();
    }
}

function updateExchangeRatePreview() {
    const selectedCurrency = elements.expenseCurrencySelect.value;
    const baseCurrency = state.trip.currency;
    const amount = parseFloat(elements.expenseAmountInput.value) || 0;
    
    if (selectedCurrency !== baseCurrency) {
        const rate = parseFloat(elements.expenseExchangeRateInput.value) || 0;
        const converted = amount * rate;
        elements.exchangeRatePreview.textContent = `Importo convertito: ${formatCurrency(converted)}`;
    } else {
        elements.exchangeRatePreview.textContent = `Importo convertito: ${formatCurrency(amount)}`;
    }
}


// --- SETUP MODALS FOR EDIT ---
function setupEditTransactionModal(txId) {
    const tx = getTransaction(txId);
    if (!tx) return;

    if (tx.type === 'expense') {
        // Pre-fill Expense form
        elements.expenseIdInput.value = tx.id;
        elements.expenseDescInput.value = tx.description;
        elements.expenseCategorySelect.value = tx.category;
        elements.expenseDateInput.value = tx.date;
        
        populatePayerDropdowns();
        elements.expensePayerSelect.value = tx.payerId;
        
        populateSplitsList(tx.splitIds);

        // Pre-fill currency values
        if (tx.originalCurrency && tx.originalCurrency !== state.trip.currency) {
            elements.expenseCurrencySelect.value = tx.originalCurrency;
            elements.expenseAmountInput.value = tx.originalAmount;
            elements.expenseExchangeRateInput.value = tx.exchangeRate;
        } else {
            elements.expenseCurrencySelect.value = state.trip.currency;
            elements.expenseAmountInput.value = tx.amount;
            elements.expenseExchangeRateInput.value = '';
        }
        
        handleExpenseCurrencyChange();
        
        document.getElementById('modal-expense-title').textContent = "Modifica Spesa";
        openModal(elements.modalExpense);
    } else {
        // Pre-fill Income form
        elements.incomeIdInput.value = tx.id;
        populatePayerDropdowns();
        elements.incomePayerSelect.value = tx.payerId;
        elements.incomeAmountInput.value = tx.amount;
        elements.incomeDateInput.value = tx.date;
        elements.incomeAmountCurrencyLabel.textContent = state.trip.currency;
        
        document.getElementById('modal-income-title').textContent = "Modifica Versamento in Cassa";
        openModal(elements.modalIncome);
    }
}

// --- RECEIPT OCR PARSING HEURISTICS ---
function parseReceiptText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 1. Heuristics for Description:
    // Take the first line that looks like a store name (longer than 3 chars, avoids numbers and dates)
    let description = '';
    const dateRegex = /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4}/;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        const lettersOnly = line.replace(/[^a-zA-Z\s]/g, '').trim();
        if (lettersOnly.length >= 3 && !dateRegex.test(line) && !line.toLowerCase().includes('piva') && !line.toLowerCase().includes('codice')) {
            description = line;
            break;
        }
    }
    if (!description && lines.length > 0) {
        description = lines[0].substring(0, 30);
    }
    
    // 2. Heuristics for Date:
    let date = new Date().toISOString().substring(0, 10); // fallback today
    for (const line of lines) {
        const match = line.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2,4})/);
        if (match) {
            let day = match[1];
            let month = match[2];
            let year = match[3];
            if (year.length === 2) {
                year = '20' + year;
            }
            date = `${year}-${month}-${day}`;
            break;
        }
    }

    // 3. Heuristics for Amount:
    // Extract decimal numbers (12,34 or 12.34)
    let amounts = [];
    lines.forEach(line => {
        const matches = line.match(/\d+[\.,]\d{2}\b/g);
        if (matches) {
            matches.forEach(m => {
                const cleanNum = parseFloat(m.replace(',', '.'));
                if (!isNaN(cleanNum)) {
                    amounts.push({ val: cleanNum, line: line.toLowerCase() });
                }
            });
        }
    });

    let detectedAmount = 0;
    // Look for lines containing totals keywords
    const totalLines = amounts.filter(a => 
        a.line.includes('totale') || 
        a.line.includes('total') || 
        a.line.includes('importo') || 
        a.line.includes('pagare') || 
        a.line.includes('somma') ||
        a.line.includes('eur') ||
        a.line.includes('chf')
    );

    if (totalLines.length > 0) {
        detectedAmount = Math.max(...totalLines.map(a => a.val));
    } else if (amounts.length > 0) {
        // Fallback: take the absolute maximum decimal value found
        detectedAmount = Math.max(...amounts.map(a => a.val));
    }

    // 4. Heuristics for Category:
    const fullTextLower = text.toLowerCase();
    let category = 'Altro';

    const catKeywords = {
        'Cibo': ['conad', 'coop', 'esselunga', 'carrefour', 'lidl', 'pam', 'penny', 'supermercato', 'ristorante', 'pizzeria', 'trattoria', 'osteria', 'bar', 'caffè', 'pub', 'cibo', 'pranzo', 'cena', 'colazione', 'spesa', 'alimentari', 'mcdonald', 'burger', 'pizza', 'pasta', 'panino', 'food', 'market'],
        'Alloggio': ['hotel', 'albergo', 'hostel', 'ostello', 'bnb', 'booking', 'airbnb', 'camera', 'soggiorno', 'alloggio', 'camping', 'campeggio', 'accomodation', 'stanza'],
        'Trasporti': ['benzina', 'carburante', 'diesel', 'gasolio', 'shell', 'eni', 'q8', 'ip', 'tamoil', 'autostrada', 'pedaggio', 'taxi', 'treno', 'trenitalia', 'italo', 'bus', 'autobus', 'metro', 'volo', 'aereo', 'ryanair', 'easyjet', 'parcheggio', 'parking', 'noleggio', 'rent', 'car', 'fuel', 'station'],
        'Svago': ['museo', 'cinema', 'teatro', 'concerto', 'biglietto', 'ticket', 'evento', 'mostra', 'tour', 'guida', 'parco', 'gardaland', 'funivia', 'skipass', 'museum', 'show', 'exhibition', 'attraction']
    };

    outerLoop:
    for (const [cat, keywords] of Object.entries(catKeywords)) {
        for (const word of keywords) {
            if (fullTextLower.includes(word)) {
                category = cat;
                break outerLoop;
            }
        }
    }

    // 5. Guess Currency
    let currency = state.trip.currency;
    if (fullTextLower.includes('chf') || fullTextLower.includes('franco') || fullTextLower.includes('svizzera')) {
        currency = 'CHF';
    } else if (fullTextLower.includes('$') || fullTextLower.includes('usd') || fullTextLower.includes('dollar')) {
        currency = 'USD';
    } else if (fullTextLower.includes('£') || fullTextLower.includes('gbp') || fullTextLower.includes('pound')) {
        currency = 'GBP';
    } else if (fullTextLower.includes('€') || fullTextLower.includes('eur') || fullTextLower.includes('euro')) {
        currency = 'EUR';
    }

    return {
        description: description.substring(0, 40),
        amount: detectedAmount || '',
        category,
        date,
        currency
    };
}

// --- EVENT BINDING & HANDLERS ---
export function bindUIEvents() {
    
    // --- 1. WELCOME ACTIONS ---
    elements.btnNewTrip.addEventListener('click', () => {
        elements.formTrip.reset();
        elements.tripIdInput.value = '';
        document.getElementById('modal-trip-title').textContent = "Nuovo Viaggio";
        openModal(elements.modalTrip);
    });

    elements.btnImportTrip.addEventListener('click', () => {
        elements.formImport.reset();
        elements.importFilename.textContent = '';
        elements.btnConfirmImport.disabled = true;
        openModal(elements.modalImport);
    });

    // --- 2. HEADER ACTIONS ---
    elements.btnTripSettings.addEventListener('click', () => {
        elements.tripIdInput.value = state.trip.id;
        elements.tripNameInput.value = state.trip.name;
        elements.tripCurrencySelect.value = state.trip.currency;
        elements.tripBudgetInput.value = state.trip.budget || '';
        document.getElementById('modal-trip-title').textContent = "Impostazioni Viaggio";
        openModal(elements.modalTrip);
    });

    elements.btnExport.addEventListener('click', () => {
        exportTripAsJSON();
        showToast("Esportazione JSON completata", "success");
    });

    // btn-share-trip is handled in section 11 (Cloud Share Logic)

    elements.btnCloseTrip.addEventListener('click', () => {
        if (confirm("Sei sicuro di voler chiudere e cancellare la sessione attiva del viaggio? Assicurati di aver esportato i dati se desideri conservarli.")) {
            resetTrip();
            clearTripStorage();
            showToast("Viaggio chiuso", "info");
            refreshAllViews();
        }
    });

    // --- 3. BOTTOM NAV ACTIONS ---
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-target'));
        });
    });

    elements.btnViewAllTransactions.addEventListener('click', () => {
        switchTab('view-transactions');
    });

    // --- 4. ACTION BUTTONS ---
    elements.btnMainAddExpense.addEventListener('click', () => {
        if (state.trip.participants.length === 0) {
            showToast("Aggiungi almeno un partecipante prima di inserire una spesa", "error");
            switchTab('view-participants');
            return;
        }
        elements.formExpense.reset();
        elements.expenseIdInput.value = '';
        elements.expenseDateInput.value = new Date().toISOString().substring(0, 10);
        elements.expenseCurrencySelect.value = state.trip.currency;
        handleExpenseCurrencyChange();
        populatePayerDropdowns();
        populateSplitsList([]);
        document.getElementById('modal-expense-title').textContent = "Aggiungi Spesa";
        openModal(elements.modalExpense);
    });

    elements.btnMainAddIncome.addEventListener('click', () => {
        if (state.trip.participants.length === 0) {
            showToast("Aggiungi almeno un partecipante prima di fare un versamento", "error");
            switchTab('view-participants');
            return;
        }
        elements.formIncome.reset();
        elements.incomeIdInput.value = '';
        elements.incomeDateInput.value = new Date().toISOString().substring(0, 10);
        elements.incomeAmountCurrencyLabel.textContent = state.trip.currency;
        populatePayerDropdowns();
        document.getElementById('modal-income-title').textContent = "Aggiungi Versamento in Cassa";
        openModal(elements.modalIncome);
    });

    elements.btnMainAddParticipant.addEventListener('click', () => {
        elements.formParticipant.reset();
        openModal(elements.modalParticipant);
    });

    // --- 5. MULTI-CURRENCY LISTENERS ---
    elements.expenseCurrencySelect.addEventListener('change', () => {
        handleExpenseCurrencyChange();
    });
    
    elements.expenseAmountInput.addEventListener('input', () => {
        updateExchangeRatePreview();
    });
    
    elements.expenseExchangeRateInput.addEventListener('input', () => {
        updateExchangeRatePreview();
    });

    // --- 6. OCR RECEIPTS SCANNING LOGIC ---
    const handleOCRFile = (file) => {
        if (!file) return;
        
        // Show Loading Overlay
        elements.ocrLoadingOverlay.style.display = 'flex';
        elements.ocrProgressText.textContent = "Caricamento OCR...";

        // Execute OCR using Tesseract.js
        Tesseract.recognize(
            file,
            'ita',
            { logger: m => {
                if (m.status === 'recognizing text') {
                    elements.ocrProgressText.textContent = `Scansione testo: ${Math.round(m.progress * 100)}%`;
                } else {
                    elements.ocrProgressText.textContent = m.status;
                }
            }}
        ).then(({ data: { text } }) => {
            const parsed = parseReceiptText(text);
            
            // Fill Fields
            if (parsed.description) elements.expenseDescInput.value = parsed.description;
            if (parsed.amount) elements.expenseAmountInput.value = parsed.amount;
            if (parsed.category) elements.expenseCategorySelect.value = parsed.category;
            if (parsed.date) elements.expenseDateInput.value = parsed.date;
            
            // Update currency selection
            elements.expenseCurrencySelect.value = parsed.currency;
            handleExpenseCurrencyChange();

            showToast("Scontrino scansionato!", "success");
        }).catch(err => {
            console.error("OCR Error: ", err);
            showToast("Errore durante la scansione. Riprova.", "error");
        }).finally(() => {
            elements.ocrLoadingOverlay.style.display = 'none';
        });
    };

    // Dropzone logic
    elements.ocrDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.ocrDropZone.classList.add('dragover');
    });
    elements.ocrDropZone.addEventListener('dragleave', () => {
        elements.ocrDropZone.classList.remove('dragover');
    });
    elements.ocrDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.ocrDropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleOCRFile(file);
    });
    elements.ocrDropZone.addEventListener('click', () => {
        elements.ocrFileInput.click();
    });
    elements.ocrFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleOCRFile(file);
    });

    // --- 7. MODAL FORM SUBMISSIONS ---
    
    // Trip Form (New / Settings)
    elements.formTrip.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = elements.tripIdInput.value;
        const name = elements.tripNameInput.value;
        const currency = elements.tripCurrencySelect.value;
        const budget = elements.tripBudgetInput.value;

        if (id) {
            // Edit
            updateTripSettings(name, currency, budget);
            showToast("Impostazioni salvate", "success");
        } else {
            // Create
            initTrip(name, currency, budget);
            showToast("Nuovo viaggio creato!", "success");
        }

        saveTripToStorage();
        closeAllModals();
        refreshAllViews();
    });

    // Participant Form
    elements.formParticipant.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = elements.participantNameInput.value;
        
        if (state.trip.participants.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
            showToast("Un partecipante con questo nome esiste già!", "error");
            return;
        }

        addParticipant(name);
        saveTripToStorage();
        closeAllModals();
        showToast(`Aggiunto ${name}`, "success");
        refreshAllViews();
    });

    // Expense Form
    elements.formExpense.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = elements.expenseIdInput.value;
        const desc = elements.expenseDescInput.value;
        const cat = elements.expenseCategorySelect.value;
        const amountVal = parseFloat(elements.expenseAmountInput.value);
        const currencyVal = elements.expenseCurrencySelect.value;
        const date = elements.expenseDateInput.value;
        const payer = elements.expensePayerSelect.value;
        
        // Find checked splits
        const checkedSplits = [];
        elements.expenseSplitsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.checked) checkedSplits.push(cb.value);
        });

        if (checkedSplits.length === 0) {
            showToast("Devi selezionare almeno un partecipante tra cui dividere la spesa!", "error");
            return;
        }

        // Multi-currency calculation
        let finalAmountInBase = amountVal;
        let origAmount = null;
        let origCurrency = null;
        let exRate = null;

        if (currencyVal !== state.trip.currency) {
            exRate = parseFloat(elements.expenseExchangeRateInput.value) || 1.0;
            finalAmountInBase = amountVal * exRate;
            origAmount = amountVal;
            origCurrency = currencyVal;
        }

        // Validate that if paid by cassa comune, there is enough cash
        if (payer === 'cassa_comune') {
            const pot = getPotStats();
            // Deduct the old amount if editing
            let previousTxAmount = 0;
            if (id) {
                const oldTx = getTransaction(id);
                if (oldTx && oldTx.payerId === 'cassa_comune') {
                    previousTxAmount = oldTx.amount;
                }
            }
            const currentPotBalance = pot.balance + previousTxAmount;
            if (currentPotBalance < finalAmountInBase) {
                showToast(`Nota: Cassa Comune in passivo di ${(finalAmountInBase - currentPotBalance).toFixed(2)} ${state.trip.currency}`, "info");
            }
        }

        const data = {
            description: desc,
            amount: finalAmountInBase,
            date: date,
            payerId: payer,
            category: cat,
            splitIds: checkedSplits,
            originalAmount: origAmount,
            originalCurrency: origCurrency,
            exchangeRate: exRate
        };

        if (id) {
            // Edit
            updateTransaction(id, data);
            showToast("Spesa modificata", "success");
        } else {
            // Add
            addTransaction({ type: 'expense', ...data });
            showToast("Spesa registrata", "success");
        }

        saveTripToStorage();
        closeAllModals();
        refreshAllViews();
    });

    // Splits helpers
    elements.btnSplitAll.addEventListener('click', () => {
        elements.expenseSplitsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });

    elements.btnSplitNone.addEventListener('click', () => {
        elements.expenseSplitsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    });

    // Income Form (Contributions)
    elements.formIncome.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = elements.incomeIdInput.value;
        const payer = elements.incomePayerSelect.value;
        const amount = elements.incomeAmountInput.value;
        const date = elements.incomeDateInput.value;

        const data = {
            description: `Versamento Cassa Comune`,
            amount: amount,
            date: date,
            payerId: payer
        };

        if (id) {
            updateTransaction(id, data);
            showToast("Versamento modificato", "success");
        } else {
            addTransaction({ type: 'income', ...data });
            showToast("Versamento registrato", "success");
        }

        saveTripToStorage();
        closeAllModals();
        refreshAllViews();
    });

    // --- 8. FILTERS AND SEARCH LISTENER ---
    elements.searchTxInput.addEventListener('input', () => renderTransactionsView());
    elements.filterTxType.addEventListener('change', () => renderTransactionsView());
    elements.filterTxCategory.addEventListener('change', () => renderTransactionsView());

    // --- 9. IMPORT FORM HANDLING ---
    let importedJSONContent = '';

    // Drag & Drop for Import Viaggio
    const handleDragOver = (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('dragover');
    };

    const handleDragLeave = () => {
        elements.dropZone.classList.remove('dragover');
    };

    const processFile = (file) => {
        if (!file) return;
        
        elements.importFilename.textContent = `Caricato: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            importedJSONContent = e.target.result;
            elements.btnConfirmImport.disabled = false;
        };
        reader.readAsText(file);
    };

    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragenter', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        processFile(file);
    });

    elements.dropZone.addEventListener('click', () => {
        elements.importFileInput.click();
    });

    elements.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        processFile(file);
    });

    elements.formImport.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!importedJSONContent) return;

        try {
            const success = importTripFromJSON(importedJSONContent);
            if (success) {
                showToast("Viaggio importato con successo!", "success");
                closeAllModals();
                refreshAllViews();
            }
        } catch (error) {
            showToast("Errore di formato! File non valido.", "error");
        }
    });

    // --- 10. GLOBAL MODAL CANCEL/CLOSE ---
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
        });
    });

    // Close on click outside card
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // --- 11. CLOUD SHARE LOGIC ---
    const shareStatus = document.getElementById('share-status');
    const shareContent = document.getElementById('share-content');
    const shareLinkInput = document.getElementById('share-link-input');
    const shareQrImg = document.getElementById('share-qr-img');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
    const btnShareNative = document.getElementById('btn-share-native');
    const btnSyncUpdate = document.getElementById('btn-sync-update');

    async function openShareModal() {
        openModal(elements.modalShare);
        shareStatus.style.display = 'block';
        shareContent.style.display = 'none';
        shareStatus.innerHTML = '<span class="spinner"></span> Caricamento dati nel cloud...';

        try {
            const tripData = JSON.parse(exportTripAsJSON());
            const blobId = await uploadTripToCloud(tripData);
            const link = generateInviteLink(blobId);

            shareLinkInput.value = link;
            shareQrImg.src = generateQRCodeUrl(link);

            btnCopyLink.onclick = () => {
                navigator.clipboard.writeText(link).then(() => showToast('Link copiato!', 'success'));
            };
            btnShareWhatsapp.onclick = () => {
                window.open(`https://wa.me/?text=${encodeURIComponent('Unisciti al viaggio su Cassa Comune! ' + link)}`, '_blank');
            };
            btnShareNative.onclick = () => {
                if (navigator.share) {
                    navigator.share({ title: 'Cassa Comune', text: 'Unisciti al nostro viaggio!', url: link });
                } else {
                    navigator.clipboard.writeText(link).then(() => showToast('Link copiato negli appunti!', 'success'));
                }
            };
            btnSyncUpdate.onclick = async () => {
                btnSyncUpdate.disabled = true;
                btnSyncUpdate.innerHTML = '<span class="spinner"></span> Aggiornamento...';
                try {
                    const data = JSON.parse(exportTripAsJSON());
                    await uploadTripToCloud(data);
                    showToast('Dati aggiornati nel cloud!', 'success');
                } catch (err) {
                    showToast('Errore aggiornamento: ' + err.message, 'error');
                } finally {
                    btnSyncUpdate.disabled = false;
                    btnSyncUpdate.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Aggiorna dati nel cloud';
                }
            };

            shareStatus.style.display = 'none';
            shareContent.style.display = 'block';
        } catch (err) {
            shareStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-danger"></i> Errore: ${err.message}`;
        }
    }

    elements.btnShareTrip.addEventListener('click', openShareModal);

    // --- 12. JOIN FROM URL on app load ---
    async function checkJoinUrl() {
        const joinId = getJoinIdFromUrl();
        if (!joinId) return;
        try {
            showToast('Caricamento viaggio condiviso...', 'info');
            const tripData = await downloadTripFromCloud(joinId);
            const success = importTripFromJSON(JSON.stringify(tripData));
            if (success) {
                saveBlobId(joinId);
                // Remove ?join= from URL without reload
                const url = new URL(window.location.href);
                url.searchParams.delete('join');
                window.history.replaceState({}, '', url);
                showToast('Viaggio condiviso caricato!', 'success');
                refreshAllViews();
            }
        } catch (err) {
            showToast('Errore caricamento viaggio: ' + err.message, 'error');
        }
    }

    // Run join check at startup
    checkJoinUrl();
}
